import { Suspense } from "react";
import { ConversationView } from "@/features/conversation/views/ConversationView";

export default function HomePage() {
  // useSearchParams (preview ?orb=) exige Suspense en el App Router.
  return (
    <Suspense fallback={null}>
      <ConversationView />
    </Suspense>
  );
}
