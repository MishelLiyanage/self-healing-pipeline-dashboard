import { useState } from "react";
import { getDataUrl, getTargetAppUrl, setDataUrl, setTargetAppUrl } from "../lib/settings";

export default function SettingsPanel({ onClose }) {
  const [targetAppUrl, setTargetAppUrlState] = useState(getTargetAppUrl());
  const [dataUrl, setDataUrlState] = useState(getDataUrl());

  function save() {
    setTargetAppUrl(targetAppUrl);
    setDataUrl(dataUrl);
    onClose();
  }

  return (
    <div className="settings-panel">
      <div className="field">
        <label htmlFor="target-app-url">
          target-app base URL
          <span className="hint">
            the EKS LoadBalancer hostname, e.g. http://a1b2c3...elb.amazonaws.com — changes
            every time the cluster is recreated, check with `kubectl get svc target-app-svc`
          </span>
        </label>
        <input
          id="target-app-url"
          type="text"
          placeholder="http://<hostname>"
          value={targetAppUrl}
          onChange={(e) => setTargetAppUrlState(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="data-url">
          Dashboard data URL
          <span className="hint">
            where episodes.json is published (this app's own S3 static-website bucket)
          </span>
        </label>
        <input
          id="data-url"
          type="text"
          placeholder="http://<bucket>.s3-website.<region>.amazonaws.com"
          value={dataUrl}
          onChange={(e) => setDataUrlState(e.target.value)}
        />
      </div>
      <div className="settings-actions">
        <button onClick={save}>Save</button>
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
