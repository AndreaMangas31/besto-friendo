import { Suspense } from "react";
import { ConversationView } from "@/features/conversation/views/ConversationView";
import { GateShell } from "@/features/gate/components/GateShell";

export default function HomePage() {
  // useSearchParams (preview ?orb=) exige Suspense en el App Router.
  return (
    <GateShell>
      <Suspense fallback={null}>
        <ConversationView />
      </Suspense>
    </GateShell>
  );
}
