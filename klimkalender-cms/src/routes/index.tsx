import { createFileRoute, Link } from '@tanstack/react-router'
import logo from '../logo.svg'
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function signInWithEmail() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'robert@bakkerfamily.net',
    password: 'xxxx',
  })
  console.log('data', data);
  console.log('error', error);
}


export const Route = createFileRoute('/')({
  component: App,
})

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
    <div className="text-center">
      <header className="min-h-screen flex flex-col items-center justify-center bg-[#282c34] text-white text-[calc(10px+2vmin)]">
        <img
          src={logo}
          className="h-[40vmin] pointer-events-none animate-[spin_20s_linear_infinite]"
          alt="logo"
        />
        <p>
          Edit <code>src/routes/index.tsx</code> and save to reload.
        </p>
        <a
          className="text-[#61dafb] hover:underline"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <a
          className="text-[#61dafb] hover:underline"
          href="https://tanstack.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn TanStack
        </a>
        <p>
          <Link to="/about">Go to "/about"</Link>
        </p>
        <div>
          <h1>Instruments</h1>
          <a href="#" onClick={signInWithEmail}>Sign in with email</a>
          <ul>
            {instruments.map((instrument) => (
              <li key={instrument.name}>{instrument.name}</li>
            ))}
          </ul>
        </div>
      </header>

    </div>
  )
}


