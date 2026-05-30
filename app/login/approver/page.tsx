// app/login/approver/page.tsx
import { Suspense } from "react";
import ApproverLoginPage from "./ApproverLoginPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ApproverLoginPage />
    </Suspense>
  );
}