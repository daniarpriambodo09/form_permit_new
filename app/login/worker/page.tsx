// app/login/worker/page.tsx

import { Suspense } from "react";
import WorkerLoginPage from "./WorkerLoginPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WorkerLoginPage />
    </Suspense>
  );
}