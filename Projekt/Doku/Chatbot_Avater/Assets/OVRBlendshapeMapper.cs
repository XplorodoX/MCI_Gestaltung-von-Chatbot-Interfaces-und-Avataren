using UnityEngine;
using UnityEngine.TextCore.Text;

[System.Serializable]
public class VisemeMap
{
    public int[] blendShapes;// blendshape indices
    public float blendShapesweight = 1;
    public int[] blendShapes2;// blendshape indices
    public float blendShapesweight2 = 1;
    public int[] blendShapes3;// blendshape indices
    public float blendShapesweight3 = 1;
    [Header("Mouth Open")]
    [Range(0f, 1f)]
    public float mouthOpenAmount;
    public float mouthOpenRotAmount;
}
public class OVRBlendshapeMapper : MonoBehaviour
{
    [Tooltip("Skinned Mesh Rendered target to be driven by Oculus Lipsync")]
    public SkinnedMeshRenderer skinnedMeshRenderer = null;

    [Range(1, 100)]
    [Tooltip("Smoothing of 1 will yield only the current predicted viseme, 100 will yield an extremely smooth viseme response.")]
    public int smoothAmount = 70;

    public OVRLipSyncContextBase lipsyncContext = null;

    public Character character;
    void Start()
    {
        skinnedMeshRenderer = character.skinnedMeshRenderer;
        if (skinnedMeshRenderer == null)
        {
            Debug.LogError("LipSyncContextMorphTarget.Start Error: " +
                "Please set the target Skinned Mesh Renderer to be controlled!");
            return;
        }

        lipsyncContext = GetComponent<OVRLipSyncContextBase>();
        if (lipsyncContext == null)
        {
            Debug.LogError("LipSyncContextMorphTarget.Start Error: " +
                "No OVRLipSyncContext component on this object!");
        }
        else
        {
            lipsyncContext.Smoothing = smoothAmount;
        }
    }


    void Update()
    {
        if ((lipsyncContext != null) && (skinnedMeshRenderer != null))
        {
            OVRLipSync.Frame frame = lipsyncContext.GetCurrentPhonemeFrame();
            if (frame != null)
            {
                SetVisemeToMorphTarget(frame);
                if (character.lowerTeeth != null)
                {
                    ApplyMoutPos(frame);
                }
            }
        }
    }

    void SetVisemeToMorphTarget(OVRLipSync.Frame frame)
    {
        for (int i = 0; i < character.visemeToBlendTargets.Length; i++)
        {
            VisemeMap map = character.visemeToBlendTargets[i];
            if (map == null || map.blendShapes == null) continue;
            float weight = frame.Visemes[i]* 100f * map.blendShapesweight;
            float weight2 = frame.Visemes[i] * 100f * map.blendShapesweight;
            float weight3 = frame.Visemes[i] * 100f * map.blendShapesweight;

            for (int j = 0; j < map.blendShapes.Length; j++)
            {
                skinnedMeshRenderer.SetBlendShapeWeight(
                        character.visemeToBlendTargets[i].blendShapes[j],
                        weight);
            }

            for (int j = 0; j < map.blendShapes2.Length; j++)
            {
                skinnedMeshRenderer.SetBlendShapeWeight(
                        character.visemeToBlendTargets[i].blendShapes2[j],
                        weight2);
            }

            for (int j = 0; j < map.blendShapes3.Length; j++)
            {
                skinnedMeshRenderer.SetBlendShapeWeight(
                        character.visemeToBlendTargets[i].blendShapes3[j],
                        weight3);
            }
        }
    }

    void ApplyMoutPos(OVRLipSync.Frame frame)
    {
        float ammount = 0f;
        for (int i = 0; i < character.visemeToBlendTargets.Length; i++)
        {
            if ((frame.Visemes[i] * character.visemeToBlendTargets[i].mouthOpenAmount) > ammount)
            {
                ammount = frame.Visemes[i] * character.visemeToBlendTargets[i].mouthOpenAmount;
                character.lowerTeeth.localPosition = character.lowerTeethClosedPos + character.lowerTeethOpenOffset * character.visemeToBlendTargets[i].mouthOpenAmount * frame.Visemes[i];
                character.lowerTeeth.localEulerAngles = character.lowerTeethClosedRot + character.lowerTeethOpenRot * character.visemeToBlendTargets[i].mouthOpenAmount * frame.Visemes[i];
            }
        }
    }
}
