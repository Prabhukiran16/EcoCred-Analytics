import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function useAuthGuard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("ecocred_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    setReady(true);
  }, [router]);

  return ready;
}
