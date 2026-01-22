using System.Linq;
using UnityEngine;

public class Character : MonoBehaviour
{
    public string voice;
    public SkinnedMeshRenderer skinnedMeshRenderer = null;
    public VisemeMap[] visemeToBlendTargets = new VisemeMap[OVRLipSync.VisemeCount];

    [Header("Teeth Transforms")]
    public Transform upperTeeth;
    public Transform lowerTeeth;


    public Vector3 lowerTeethClosedPos;
    public Vector3 lowerTeethClosedRot;

    public Vector3 lowerTeethOpenOffset;
    public Vector3 lowerTeethOpenRot;
}
