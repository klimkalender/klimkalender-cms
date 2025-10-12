import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function signInWithEmail() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'robert@bakkerfamily.net',
    password: 'QJE8nkf3krn@gjx*eaf',
  })
  console.log('data', data);
  console.log('error', error);
}

function App() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [instruments, setInstruments] = useState<any[]>([]);

  useEffect(() => {
    getInstruments();
  }, []);

  async function getInstruments() {
    const { data } = await supabase.from("instruments").select();
    if (data) setInstruments(data);
  }

  return (
    <div>
      <h1>Instruments</h1>
      <a href="#" onClick={signInWithEmail}>Sign in with email</a>
      <ul>
        {instruments.map((instrument) => (
          <li key={instrument.name}>{instrument.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;