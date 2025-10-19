import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { FileObject } from '@supabase/storage-js';
import Uppy from '@uppy/core';
import { Dashboard } from '@uppy/react';
import Tus, { type TusBody } from '@uppy/tus';

import '@uppy/core/css/style.min.css';
import '@uppy/dashboard/css/style.min.css';
import '@uppy/webcam/css/style.min.css';
import { useAuth } from '@/auth';
import type { Database } from '@/database.types';
import type { Organizer } from '@/types';

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

type Venue = Database['public']['Tables']['venues']['Row'];
type Event = Database['public']['Tables']['events']['Row'];

function HomeComponent() {
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const auth = useAuth();
  const [events, setEvents] = useState<Event[]|null>(null);
  const [files, setFiles] = useState<FileObject[]>([]);
  const [venues, setVenues] = useState<Venue[]|null>(null);
  const [tags, setTags] = useState<{ [id: string]: string[] }|null>(null);
  const [organizers, setOrganizers] = useState<Organizer[]|null>(null);
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
    readEvents();
    readVenues();
    readTags();
    readOrganizers();
  }, []);


  async function readEvents() {
    const { data, error } = await supabase.from("events").select().order("start_date_time", { ascending: true });
    if (data) setEvents(data);
    if (error) console.error("Error fetching events:", error);
  }

  async function readVenues() {
    const { data, error } = await supabase.from("venues").select().order("name", { ascending: true });
    if (data) setVenues(data);
    if (error) console.error("Error fetching venues:", error);
  }

  async function readOrganizers() {
    const { data, error } = await supabase.from("organizers").select().order("name", { ascending: true });
    if (data) setOrganizers(data);
    console.dir(data);
    if (error) console.error("Error fetching organizers:", error);
  }

  async function readTags() {
    const { data, error } = await supabase.from("event_tags").select('event_id, tags (name)');
    if (data) {
      const tagsMap: { [id: string]: string[] } = {};
      // supabase has typing wrong here, so we need to cast
      const fixedData = data as unknown as {
        event_id: any;
        tags: {
          name: any;
        };  
      }[];
      fixedData.forEach(tag => {
          if (!tagsMap[tag.event_id]) {
            tagsMap[tag.event_id] = [];
          }
          // console.dir(tag.tags.name);
          tagsMap[tag.event_id].push(tag.tags.name);
        });
      // console.dir(tagsMap);
      setTags(tagsMap);
    }
    if (error) console.error("Error fetching tags:", error);
  }



  return (
    <div className="p-2 grid gap-2">
      <h1 className="text-xl">Welcome!</h1>
      {/* <div>
        <h1>Events</h1>
        <ul>
          {events?.map((event) => (
            <li key={event.title}>{event.title}</li>
          ))}
        </ul>
      </div> */}
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
