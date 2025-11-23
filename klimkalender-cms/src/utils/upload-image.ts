import { supabase } from '../data/supabase';

export async function uploadEventImage(imageUrl: string, currentImageRef?: string): Promise<string | null> {
  const session = await supabase.auth.getSession()
  const accessToken = session.data.session?.access_token;

  const response = await fetch('https://zrshjxlfodmuulctapbw.supabase.co/functions/v1/image-grabber', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrl, currentImageRef }),
  })

  if (response.ok) {
    const respJson = await response.json()
    return respJson.imageRef;
  }
  console.error('Image upload error:', response);
  return null;
}