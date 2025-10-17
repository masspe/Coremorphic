import Layout from "./Layout.jsx";
import Home from "./Home";
import Dashboard from "./Dashboard";
import Builder from "./Builder";
import NotFound from "./NotFound.jsx";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { createPageUrl } from "@/utils";

const PAGES = {
    Home: Home,
    Dashboard: Dashboard,
    Builder: Builder,
};

const PAGE_NAMES = Object.keys(PAGES);
const DEFAULT_PAGE_NAME = PAGE_NAMES[0];
const DEFAULT_PAGE_COMPONENT = DEFAULT_PAGE_NAME ? PAGES[DEFAULT_PAGE_NAME] : null;

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
        const routes = [
            <Route key={pageName} path={canonicalPath} element={<PageComponent />} />
        ];

        if (pageName === DEFAULT_PAGE_NAME && DEFAULT_PAGE_COMPONENT && canonicalPath !== "/") {
            routes.push(
                <Route
                    key={`${pageName}-index`}
                    path="/"
                    element={<DEFAULT_PAGE_COMPONENT />}
                />
            );
        }

        if (pageName === DEFAULT_PAGE_NAME && DEFAULT_PAGE_COMPONENT && canonicalPath === "/") {
            return [
                <Route key={`${pageName}-index`} path="/" element={<DEFAULT_PAGE_COMPONENT />} />,
                <Route key={`${pageName}-alias`} path="/home" element={<DEFAULT_PAGE_COMPONENT />} />
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