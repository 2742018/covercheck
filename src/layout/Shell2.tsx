import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { removeLocal } from "../lib/storage";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function Shell() {
  React.useEffect(() => {
    // Clear previously persisted images/reports so uploads never "stick" again.
    removeLocal("covercheck.play.v1");
    removeLocal("covercheck.analyze.v5");
    removeLocal("covercheck.report.v1");
    removeLocal("covercheck.analyze.v6");
  }, []);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbarLeft">
          <Link to="/play" className="wordmarkLink" aria-label="CoverCheck Home">
            COVERCHECK
          </Link>

          <nav className="topLinks" aria-label="Primary">
            <NavLink to="/play" className={({ isActive }) => cx("topLink", isActive && "active")}>
              ANALYZE
            </NavLink>
            <NavLink to="/test" className={({ isActive }) => cx("topLink", isActive && "active")}>
              TEST
            </NavLink>
            <NavLink to="/match" className={({ isActive }) => cx("topLink", isActive && "active")}>
              MATCH
            </NavLink>
            <NavLink to="/mockups" className={({ isActive }) => cx("topLink", isActive && "active")}>
              MOCKUPS
            </NavLink>           
            <NavLink to="/about" className={({ isActive }) => cx("topLink", isActive && "active")}>
              ABOUT
            </NavLink>
          </nav>
        </div>

        <div className="topbarRight">
          <div className="statusPill" title="No upload leaves your device">
            <span className="statusDot" />
            PRIVATE-USE • DISSERTATION • IN-BROWSER
          </div>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="bottombar">
        <div className="bottomInner">
          <div className="bottomLeft">
            <NavLink to="/play" className={({ isActive }) => cx("bottomLink", isActive && "active")}>
              ANALYZE
            </NavLink>
            <span className="sep">|</span>
            <NavLink to="/test" className={({ isActive }) => cx("bottomLink", isActive && "active")}>
              TEST
            </NavLink>
            <span className="sep">|</span>
            <NavLink to="/match" className={({ isActive }) => cx("bottomLink", isActive && "active")}>
              MATCH
            </NavLink>
            <span className="sep">|</span>
            <NavLink to="/mockups" className={({ isActive }) => cx("bottomLink", isActive && "active")}>
              MOCKUPS
            </NavLink>
            <span className="sep">|</span>
            <NavLink to="/about" className={({ isActive }) => cx("bottomLink", isActive && "active")}>
              ABOUT
            </NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}