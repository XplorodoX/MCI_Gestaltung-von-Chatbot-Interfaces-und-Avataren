using UnityEngine;
using Unity.WebRTC;
using WebSocketSharp;
using System.Collections;
using System.Collections.Generic;
using System;

[Serializable]
public class SignalingMessage
{
    public string type;
    public string offer;
    public string answer;
    public string text;
    public IceCandidateJSON candidate;
}

[Serializable]
public class IceCandidateJSON
{
    public string candidate;
    public string sdpMid;
    public int sdpMLineIndex;
}
public class WebRTCStreamer : MonoBehaviour
{
    [SerializeField] private Camera captureCamera;
    [SerializeField] private AudioSource audioSource;
    [SerializeField] private TextToSpeech textToSpeech;
    [SerializeField] private CharacterSelector characterSelector;
    private AudioStreamTrack audioTrack;
    private RTCPeerConnection pc;
    private VideoStreamTrack videoTrack;
    private WebSocket ws;
    private MediaStream stream;

    private readonly Queue<string> messageQueue = new Queue<string>();

    void Start()
    {
        StartCoroutine(WebRTC.Update());

        StartCoroutine(SetupAndStream());
    }

    private IEnumerator SetupAndStream()
    {
     
        ws = new WebSocket("ws://localhost:3001");
        ws.OnMessage += (sender, e) => {
            lock (messageQueue)
            {
                messageQueue.Enqueue(e.Data);
            }
        };

        Debug.Log("Connecting to signaling server...");
        ws.ConnectAsync();

        float timeout = Time.time + 5f;
        while (!ws.IsAlive && Time.time < timeout)
        {
            yield return null;
        }

        if (!ws.IsAlive)
        {
            Debug.LogError("Failed to connect to signaling server!");
            yield break;
        }

        Debug.Log("Connected! Starting WebRTC...");
    }
    void Update()
    {
        lock (messageQueue)
        {
            while (messageQueue.Count > 0)
            {
                string data = messageQueue.Dequeue();
                var msg = JsonUtility.FromJson<SignalingMessage>(data);

                if (msg.type == "request_offer")
                {
                    Debug.Log("Web client requested an offer. Starting stream...");
                    StartCoroutine(StreamRoutine());
                }
                else if (msg.type == "character")
                {
                    print("Character selection message received. " + msg.text);
                    characterSelector.SelectCharacter(int.Parse(msg.text));
                }
                else if (msg.type == "message")
                {
                    print("Chat message received. " + msg.text);
                    textToSpeech.startTextToSpeech(msg.text);
                }
                else
                {
                    HandleSignalingMessage(msg);
                }
            }
        }
    }



    private IEnumerator StreamRoutine()
    {
        if (pc != null)
        {
            Debug.Log("Cleaning up old connection...");
            pc.Close();
            pc.Dispose();
            videoTrack?.Dispose();
            audioTrack?.Dispose();
            stream?.Dispose();
        }
        var config = new RTCConfiguration
        {
            iceServers = new[] { new RTCIceServer { urls = new[] { "stun:stun.l.google.com:19302" } } }
        };
        pc = new RTCPeerConnection(ref config);

        var rt = new RenderTexture(400, 720, 0, RenderTextureFormat.BGRA32);
        rt.enableRandomWrite = false;
        captureCamera.targetTexture = rt;
        captureCamera.targetTexture = rt;
        videoTrack = new VideoStreamTrack(rt);
        audioTrack = new AudioStreamTrack(audioSource);
        stream = new MediaStream();
        pc.AddTrack(videoTrack, stream);
        pc.AddTrack(audioTrack, stream);

        pc.OnIceCandidate = candidate => {
            var iceMsg = new SignalingMessage
            {
                type = "ice",
                candidate = new IceCandidateJSON
                {
                    candidate = candidate.Candidate,
                    sdpMid = candidate.SdpMid,
                    sdpMLineIndex = candidate.SdpMLineIndex ?? 0
                }
            };
            ws.Send(JsonUtility.ToJson(iceMsg));
        };

        var offerOp = pc.CreateOffer();
        yield return offerOp;

        if (!offerOp.IsError)
        {
            var desc = offerOp.Desc;
            var localDescOp = pc.SetLocalDescription(ref desc);
            yield return localDescOp;

            var msg = new SignalingMessage { type = "offer", offer = desc.sdp };
            ws.Send(JsonUtility.ToJson(msg));
            Debug.Log("Offer sent to signaling server");
        }
    }

    private void HandleSignalingMessage(SignalingMessage msg)
    {
        if (msg.type == "answer")
        {
            var desc = new RTCSessionDescription
            {
                type = RTCSdpType.Answer,
                sdp = msg.answer
            };
            pc.SetRemoteDescription(ref desc);
            StartCoroutine(HandleAnswer(desc));
        }
        if (msg.type == "ice" && msg.candidate != null)
        {
            if (string.IsNullOrEmpty(msg.candidate.candidate))
                return;

            var sdpMid = string.IsNullOrEmpty(msg.candidate.sdpMid) ? "0" : msg.candidate.sdpMid;

            var init = new RTCIceCandidateInit
            {
                candidate = msg.candidate.candidate,
                sdpMid = sdpMid,
                sdpMLineIndex = msg.candidate.sdpMLineIndex
            };

            try
            {
                pc.AddIceCandidate(new RTCIceCandidate(init));
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"Failed to add ICE candidate: {ex.Message}");
            }
        }
    }

    private IEnumerator HandleAnswer(RTCSessionDescription desc)
    {
        if (pc.SignalingState != RTCSignalingState.HaveLocalOffer)
        {
            Debug.LogWarning($"Ignoring answer: PeerConnection is in state {pc.SignalingState}, not HaveLocalOffer.");
            yield break;
        }

        var op = pc.SetRemoteDescription(ref desc);
        yield return op;

        if (op.IsError)
        {
            Debug.LogError($"SetRemoteDescription Error: {op.Error.message}");
        }
    }

    private void OnApplicationQuit()
    {
        Cleanup();
    }

    void OnDestroy()
    {
        Cleanup();
    }

    private void Cleanup()
    {
        if (pc != null)
        {
            pc.Close();
            pc.Dispose();
            pc = null;
        }

        videoTrack?.Dispose();
        videoTrack = null;

        audioTrack?.Dispose();
        audioTrack = null;

        stream?.Dispose();
        stream = null;

        if (ws != null)
        {
            if (ws.IsAlive) ws.Close();
            ws = null;
        }

        Debug.Log("WebRTC Streamer cleaned up and disposed.");
    }
}