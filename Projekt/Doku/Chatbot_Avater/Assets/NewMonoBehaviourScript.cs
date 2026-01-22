using System;
using Unity.VisualScripting;
using UnityEngine;

public class NewMonoBehaviourScript : MonoBehaviour
{
    private SkinnedMeshRenderer smr;
    private Mesh mesh;
    void Start()
    {
        smr = GetComponent<SkinnedMeshRenderer>();
        mesh = smr.sharedMesh;

        string blendshpaes = "";
        for (int i = 0; i < mesh.blendShapeCount; i++)
        {
            blendshpaes += $"{i} : {mesh.GetBlendShapeName(i)}\n";
        }
        Debug.Log(blendshpaes);
    }
}
