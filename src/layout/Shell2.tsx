import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { removeLocal } from "../lib/storage";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function Shell() {
  const location = useLocation();

  useEffect(() => {
    // Keep your privacy clears, but don’t clear report keys here (Report uses sessionStorage now).
    removeLocal("covercheck.play.v1");
    removeLocal("covercheck.analyze.v5");
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
            <NavLink
              to="/analyze"
              className={({ isActive }) => cx("topLink", isActive && "active")}
            >
              ANALYZE
            </NavLink>
            <NavLink to="/test" className={({ isActive }) => cx("topLink", isActive && "active")}>
              TEST
            </NavLink>
            <NavLink to="/match" className={({ isActive }) => cx("topLink", isActive && "active")}>
              MATCH
            </NavLink>
            <NavLink
              to="/mockups"
              className={({ isActive }) => cx("topLink", isActive && "active")}
            >
              MOCKUPS
            </NavLink>
            <NavLink
              to="/compare"
              className={({ isActive }) => cx("topLink", isActive && "active")}
            >
              COMPARE
            </NavLink>
            <NavLink
              to="/accessibility"
              className={({ isActive }) => cx("topLink", isActive && "active")}
            >
              ACCESSIBILITY
            </NavLink>
            <NavLink
              to="/methods-and-references"
              className={({ isActive }) => cx("topLink", isActive && "active")}
            >
              METHODS & REFERENCES
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => cx("topLink", isActive && "active")}>
              ABOUT
            </NavLink>
            <NavLink
              to="/licensing"
              className={({ isActive }) => cx("topLink", isActive && "active")}
            >
              USE & PRIVACY
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

      {/* Force clean swap of pages */}
      <main className="main" key={location.pathname}>
        <Outlet />
      </main>

      <footer className="bottombar">
        <div className="bottomInner">
          <div className="bottomLeft">
            <NavLink
              to="/analyze"
              className={({ isActive }) => cx("bottomLink", isActive && "active")}
            >
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
            <NavLink
              to="/mockups"
              className={({ isActive }) => cx("bottomLink", isActive && "active")}
            >
              MOCKUPS
            </NavLink>
            <span className="sep">|</span>
            <NavLink
              to="/compare"
              className={({ isActive }) => cx("bottomLink", isActive && "active")}
            >
              COMPARE
            </NavLink>
            <span className="sep">|</span>
            <NavLink
              to="/accessibility"
              className={({ isActive }) => cx("bottomLink", isActive && "active")}
            >
              ACCESSIBILITY
            </NavLink>
            <span className="sep">|</span>
            <NavLink
              to="/methods-and-references"
              className={({ isActive }) => cx("bottomLink", isActive && "active")}
            >
              METHODS & REFERENCES
            </NavLink>
            <span className="sep">|</span>
            <NavLink to="/about" className={({ isActive }) => cx("bottomLink", isActive && "active")}>
              ABOUT
            </NavLink>
            <span className="sep">|</span>
            <NavLink
              to="/licensing"
              className={({ isActive }) => cx("bottomLink", isActive && "active")}
            >
              USE & PRIVACY
            </NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
