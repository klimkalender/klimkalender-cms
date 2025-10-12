import { createFileRoute } from '@tanstack/react-router'  
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

function HomeComponent() {
  const [instruments, setInstruments] = useState<any[]>([]);

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
    </div>
  )
}
