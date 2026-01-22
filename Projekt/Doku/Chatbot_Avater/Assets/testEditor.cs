using UnityEditor;
using UnityEngine;


[CustomEditor(typeof(test))]
public class testEditor : Editor
{
    public override void OnInspectorGUI()
    {
        DrawDefaultInspector();

        test script = (test)target;

        GUILayout.Space(10);

        if (GUILayout.Button("Apply All Viseme Blendshapes"))
        {
            script.ApplyBlendshapes();
        }

        if (GUILayout.Button("Apply Single Viseme"))
        {
            script.ApplySingleViseme();
        }

        if (GUILayout.Button("Reset All Blendshapes"))
        {
            script.ResetAllBlendshapes();
        }
        if (GUILayout.Button("Aplly mouth offset"))
        {
            script.ApplyMounuthpos();
        }
    }
}
