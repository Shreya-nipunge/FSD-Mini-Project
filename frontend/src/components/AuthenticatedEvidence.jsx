import { useEffect, useState } from "react";
import { getReportEvidence } from "../services/api.js";

export default function AuthenticatedEvidence({ reportId, alt = "Report evidence", className = "" }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setUrl("");
    setFailed(false);
    if (!reportId) return undefined;

    getReportEvidence(reportId)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reportId]);

  if (failed) return <span className="text-xs text-slate-500">Evidence unavailable</span>;
  if (!url) return <span className="text-xs text-slate-500">Loading evidence…</span>;
  return <img src={url} alt={alt} className={className} />;
}
