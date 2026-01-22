using UnityEngine;

public class CharacterSelector : MonoBehaviour
{
    public TextToSpeech textToSpeech;
    public OVRBlendshapeMapper OVRLipSyncContextMorphTarget;
    public Character[] characters;

    public void Start()
    {
        SelectCharacter(0);
    }
    public void SelectCharacter(int index)
    {
        for (int i = 0; i < characters.Length; i++)
        {
            characters[i].gameObject.SetActive(i == index);
            if (i == index)
            {
                textToSpeech.voice = characters[i].voice;
                OVRLipSyncContextMorphTarget.skinnedMeshRenderer = characters[i].skinnedMeshRenderer;
                OVRLipSyncContextMorphTarget.character = characters[i];
            }
        }
    }
}
