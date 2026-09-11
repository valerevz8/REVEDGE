"use client";

import { useEffect } from "react";

export default function BrandMigration() {
  useEffect(() => {
    const normalize = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (node.parentElement?.closest("script,style,svg")) continue;
        nodes.push(node as Text);
      }
      for (const text of nodes) {
        const current = text.nodeValue ?? "";
        const next = current.replace(/REVESENSE|REVEDGE/g, "HALVER");
        if (next !== current) text.nodeValue = next;
      }
    };
    normalize();
    const observer = new MutationObserver(normalize);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
