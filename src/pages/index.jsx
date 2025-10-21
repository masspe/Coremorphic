import Layout from "./Layout.jsx";
import Home from "./Home";
import Dashboard from "./Dashboard";
import Builder from "./Builder";
import Sandbox from "./Sandbox";
import NotFound from "./NotFound.jsx";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { ClerkLoaded, ClerkLoading, RedirectToSignIn, SignedIn, SignedOut, isClerkConfigured } from '@/lib/clerk';
import { createPageUrl } from "@/utils";

const PAGES = {
    Home: Home,
    Dashboard: Dashboard,
    Builder: Builder,
    Sandbox: Sandbox,
};

const PAGE_NAMES = Object.keys(PAGES);
const DEFAULT_PAGE_NAME = PAGE_NAMES[0];
const DEFAULT_PAGE_COMPONENT = DEFAULT_PAGE_NAME ? PAGES[DEFAULT_PAGE_NAME] : null;
const PROTECTED_PAGES = new Set(["Dashboard", "Builder", "Sandbox"]);

function ProtectedRoute({ children }) {
    if (!isClerkConfigured) {
        return children;
    }

    return (
        <>
            <ClerkLoading>
                <div className="p-8 text-sm text-slate-500">Checking your session…</div>
            </ClerkLoading>
            <ClerkLoaded>
                <SignedIn>{children}</SignedIn>
                <SignedOut>
                    <RedirectToSignIn />
                </SignedOut>
            </ClerkLoaded>
        </>
    );
}

const withProtection = (pageName, element) =>
    PROTECTED_PAGES.has(pageName) ? <ProtectedRoute>{element}</ProtectedRoute> : element;

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    const pageRoutes = PAGE_NAMES.flatMap((pageName) => {
        const PageComponent = PAGES[pageName];
        const canonicalPath = createPageUrl(pageName) || "/";
        const element = withProtection(pageName, <PageComponent />);
        const routes = [
            <Route key={pageName} path={canonicalPath} element={element} />
        ];

        if (pageName === DEFAULT_PAGE_NAME && DEFAULT_PAGE_COMPONENT && canonicalPath !== "/") {
            const defaultElement = withProtection(pageName, <DEFAULT_PAGE_COMPONENT />);
            routes.push(
                <Route
                    key={`${pageName}-index`}
                    path="/"
                    element={defaultElement}
                />
            );
        }

        if (pageName === DEFAULT_PAGE_NAME && DEFAULT_PAGE_COMPONENT && canonicalPath === "/") {
            return [
                <Route key={`${pageName}-index`} path="/" element={withProtection(pageName, <DEFAULT_PAGE_COMPONENT />)} />,
                <Route key={`${pageName}-alias`} path="/home" element={withProtection(pageName, <DEFAULT_PAGE_COMPONENT />)} />
            ];
        }

        return routes;
    });

    return (
        <Layout currentPageName={currentPage} pageNames={PAGE_NAMES}>
            <Routes>
                {pageRoutes}
                <Route path="*" element={<NotFound homePageName={DEFAULT_PAGE_NAME} />} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}