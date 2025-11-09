import { getActionLog, readLastBoulderBotAction } from "@/data/supabase";
import type { Action, ActionLog } from "@/types";
import { useEffect, useState } from "react";

export type BoulderbotLogProps = { action: Action | null | undefined
   setAction?: React.Dispatch<React.SetStateAction<Action | null | undefined>>  ;
};

export function BoulderbotLogs({ action, setAction }: BoulderbotLogProps) {
  const [lastAction, setLastAction] = useState<Action | null | undefined>(action);
  const [logs, setLogs] = useState<ActionLog[] | null>(null);

  console.log("BoulderbotLogs rendered with action:", action)
  useEffect(() => {
    console.log("Action prop changed:", action);
    setLastAction(action);
  }, [action]);

  useEffect(() => {
    console.log("Setting up polling effect with lastAction:", lastAction);
    if (lastAction && !logs || lastAction && lastAction.end === null) {
      console.log("Initial fetch of logs for action id:", lastAction.id);
      getActionLog(setLogs, lastAction.id);

      const timeOut = setTimeout(() => {
        console.log("Initial timeout fetch of last action.");
        getActionLog(setLogs, lastAction.id);
        readLastBoulderBotAction((action) => { setLastAction(action); setAction && setAction(action); });
      }, 1000);
      return () => clearTimeout(timeOut);
    } else{
      console.log("No polling needed, action ended or no lastAction.");
    }
  }, [lastAction, action]);


  // useEffect(() => {
  //   console.log("Using existing lastAction:", lastAction);
  //   lastAction && getActionLog(setLogs, lastAction.id);
  //   if (lastAction && !lastAction.end) {
  //     console.log("Starting polling for logs... for action id:", lastAction.id);
  //     const interval = setInterval(async () => {
  //       console.log("Polling for logs... for action id:", lastAction.id);
  //       await getActionLog(setLogs, lastAction.id);
  //       await readLastBoulderBotAction(setLastAction);
  //     }, 5000);
  //     return () => { console.log("(cleanup) Stopping polling for logs..."); clearInterval(interval); };
  //   }
  //   console.log("Fetching last Boulderbot action...");
  // }, [lastAction]);

  // useEffect(() => {
  //   console.log("lastAction changed:", lastAction);
  //   if (!lastAction) {
  //     return;
  //   }
  //   if (lastAction?.end) {
  //     console.log("Action ended, fetching final logs for action id:", lastAction.id);
  //     getActionLog(setLogs, lastAction.id);
  //     return;
  //   }
  //   if (lastAction && !lastAction.end) {
  //     console.log("Starting polling for logs... for action id:", lastAction.id);
  //     const interval = setInterval(async () => {
  //       console.log("Polling for logs... for action id:", lastAction.id);
  //       await getActionLog(setLogs, lastAction.id);
  //       await readLastBoulderBotAction(setLastAction);
  //     }, 5000);
  //     return () => { console.log("(cleanup) Stopping polling for logs..."); clearInterval(interval); };
  //   }
  // }, [lastAction]);


  return (
    <div className="bg-black text-white p-4 rounded-lg font-mono text-sm h-150 overflow-y-auto">
      {logs && logs.length > 0 ? (
        <div className="space-y-1">
          {logs.map((log) => (
            <div key={log.id} className="whitespace-pre-wrap">
              <span className="text-gray-400">
                {new Date(log.datetime).toISOString().replace('T', ' ').slice(0, 19)}
              </span>
              {" "}{log.data}
            </div>
          ))}
        </div>
      ) : (
        <p>{logs === null ? "Loading.." : "No logs available"}</p>
      )}
    </div>
  );
}
