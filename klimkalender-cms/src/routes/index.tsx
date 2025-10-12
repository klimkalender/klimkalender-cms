import { createFileRoute, redirect } from '@tanstack/react-router'
import { use, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { FileObject } from '@supabase/storage-js';
import Uppy from '@uppy/core';
import { Dashboard } from '@uppy/react';
import Tus, { type TusBody } from '@uppy/tus';

import '@uppy/core/css/style.min.css';
import '@uppy/dashboard/css/style.min.css';
import '@uppy/webcam/css/style.min.css';
import { useAuth } from '@/auth';

export const Route = createFileRoute('/')({
  component: HomeComponent,
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
})

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

function HomeComponent() {
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const auth = useAuth();
  const [instruments, setInstruments] = useState<any[]>([]);
  const [files, setFiles] = useState<FileObject[]>([]);
  const [uploading, setUploading] = useState(false);
  const supabaseStorageURL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`

  type MyMeta = {
    authorization: string
    apikey: string,
  };

  useEffect(() => {
    console.log('Fetching files from Supabase storage...');
    supabase.storage.from('event-images').list().then(({ data, error }) => {
        if (error) {
          console.error('Error listing files:', error);
        } else {
          console.log('Files in storage:', data);
          setFiles(data.sort((a, b) => b.created_at.localeCompare(a.created_at)) || []);
        }
      });
  }, [uploading]);


  const [uppy] = useState(() => new Uppy<MyMeta, TusBody>().use(Tus, {
    endpoint: supabaseStorageURL,
    onSuccess(payload) {
      console.log('Upload complete! We got the following response:');
      console.log(payload);
      supabase.storage.from('event-images').list().then(({ data, error }) => {
        if (error) {
          console.error('Error listing files:', error);
        } else {
          console.log('Files in storage:', data);
        }
      });
    },
    headers: {
      authorization: `Bearer ${auth.user?.session?.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    }
  }));
  const STORAGE_BUCKET = 'event-images';
  const folder = '';
  uppy.on('file-added', (file) => {
    const supabaseMetadata = {
      bucketName: STORAGE_BUCKET,
      objectName: folder ? `${folder}/${file.name}` : file.name,
      contentType: file.type,
    }

    file.meta = {
      ...file.meta,
      ...supabaseMetadata,
    }
  }).on('upload-start', () => {
    setUploading(true);
  }).on('upload-success', () => {
    setUploading(false);
  });


  useEffect(() => {
    getInstruments();
  }, []);

  async function getInstruments() {
    const { data } = await supabase.from("instruments").select();
    if (data) setInstruments(data);
  }



  return (
    <div className="p-2 grid gap-2">
      <h1 className="text-xl">Welcome!</h1>
      <div>
        <h1>Instruments</h1>
        <ul>
          {instruments.map((instrument) => (
            <li key={instrument.name}>{instrument.name}</li>
          ))}
        </ul>
      </div>
      <Dashboard uppy={uppy} width={400} height={400} />
      <div>
        <h2>Uploaded Files</h2>
        <ul>
          {files.map((file) => (
            <li key={file.name}>
              {file.name}
              <img src={supabase.storage.from('event-images').getPublicUrl(file.name).data.publicUrl} alt={file.name} width={100} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
