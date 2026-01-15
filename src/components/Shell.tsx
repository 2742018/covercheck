import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isPlay = location.pathname.startsWith("/play");

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbarLeft">
          <div className="wordmark"><Link to="/play" className="wordmarkLink" aria-label="CoverCheck Home">
  COVERCHECK
</Link></div>
          <div className="topLinks">
            <NavLink className={({ isActive }) => cx("topLink", isActive && "active")} to="/play">
              ANALYZE
            </NavLink>
            <NavLink className={({ isActive }) => cx("topLink", isActive && "active")} to="/test">
              TEST
            </NavLink>
            <NavLink className={({ isActive }) => cx("topLink", isActive && "active")} to="/about">
              ABOUT
            </NavLink>
          </div>
        </div>

        <div className="topbarRight">
          <div className="statusPill">
            <span className="statusDot" aria-hidden />
            PRIVATE-USE • DISSERTATION • WEB-BROWSER
          </div>
        </div>
      </header>

      <main className={cx("main", isPlay && "mainPlay")}>{children}</main>

      <footer className="bottombar">
        <div className="bottomInner">
          <div className="bottomLeft">
            <NavLink className={({ isActive }) => cx("bottomLink", isActive && "active")} to="/play">
              ANALYZE
            </NavLink>
            <span className="sep">|</span>
            <NavLink className={({ isActive }) => cx("bottomLink", isActive && "active")} to="/test">
              TEST
            </NavLink>
            <span className="sep">|</span>
            <NavLink className={({ isActive }) => cx("bottomLink", isActive && "active")} to="/about">
              ABOUT
            </NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
