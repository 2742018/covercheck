import React from "react";

export default function AboutPage() {
  return (
    <div className="simplePage">
      <div className="simpleTitle">ABOUT / ACADEMIC</div>
      <div className="simpleBody">
        <p>
          CoverCheck is a privacy-first album cover readability tool. This page can host your business case,
          methods, and evaluation notes (heuristic review, accessibility audit, user testing).
        </p>
        <ul>
          <li>No server uploads</li>
          <li>No bundled copyrighted covers</li>
          <li>Explainable metrics (contrast, clutter, safe margins)</li>
        </ul>
      </div>
    </div>
  );
}