using System.Collections;
using UnityEngine;
using UnityEngine.Audio;
using UnityEngine.Networking;
using TMPro;
using System.Xml.Serialization;
public class TextToSpeech : MonoBehaviour
{
    public AudioSource audioSource;
    public Animator animator;
    private string apiKey = "HbvCBTgTW2N6rywjz63NRwyoXOSCpcTdKPfHaSLH1uB45Vqt6kmX33";
    public string text = "The milestone Overture 2023-07-26-alpha.0 release includes four unique data layers...";
    public string voice = "Sierra";

    public TMP_Text TMP_Text;

    public bool textToSpeechActive = false;

    private void Start()
    {
        TMP_Text.text = textToSpeechActive?"Text To Speech":"Fixed Audio";
    }
    public void startTextToSpeech(string message)
    {
        text = message;
        print("Starting Text-to-Speech...");
        if (textToSpeechActive)
        {
           StartCoroutine(SpeakText());
        }
        else
        {
            PlayAudioClip();
        }
    }

    public void toggelTextToSpeech()
    {
        textToSpeechActive = !textToSpeechActive;
        TMP_Text.text = textToSpeechActive ? "Text To Speech" : "Fixed Audio";
    }
    IEnumerator SpeakText()
    {
        string url = "https://api.v8.unrealspeech.com/speech";

        // JSON-Daten
        TTSRequest requestData = new TTSRequest()
        {
            Text = text,
            VoiceId = voice,
            Bitrate = "320k",
            AudioFormat = "mp3",
            OutputFormat = "uri",
            TimestampType = "sentence",
            sync = false
        };

        string jsonData = JsonUtility.ToJson(requestData);

        UnityWebRequest request = new UnityWebRequest(url, "POST");
        byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");
        request.SetRequestHeader("Authorization", "Bearer " + apiKey);

        yield return request.SendWebRequest();

        if (request.result != UnityWebRequest.Result.Success)
        {
            Debug.LogError("Error: " + request.error);
        }
        else
        {
            // Antwort ist JSON mit OutputUri
            Debug.Log("Response: " + request.downloadHandler.text);
            // Optional: MP3 herunterladen und abspielen
            StartCoroutine(DownloadAndPlayMP3(JsonUtility.FromJson<ResponseData>(request.downloadHandler.text).OutputUri));
        }
    }

    IEnumerator DownloadAndPlayMP3(string mp3Url)
    {
        using UnityWebRequest www = UnityWebRequestMultimedia.GetAudioClip(mp3Url, AudioType.MPEG);
        yield return www.SendWebRequest();

        if (www.result != UnityWebRequest.Result.Success)
        {
            Debug.LogError(www.error);
        }
        else
        {
            AudioClip clip = DownloadHandlerAudioClip.GetContent(www);
            audioSource.clip = clip;
            audioSource.Play();
        }
    }

    public void PlayAudioClip()
    {
        audioSource.Play();
        animator.SetTrigger("start");
    }

    [System.Serializable]
    public class ResponseData
    {
        public string OutputUri;
    }

    [System.Serializable]
    public class TTSRequest
    {
        public string Text;
        public string VoiceId;
        public string Bitrate;
        public string AudioFormat;
        public string OutputFormat;
        public string TimestampType;
        public bool sync;
    }
}
