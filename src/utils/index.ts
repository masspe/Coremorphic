


export function createPageUrl(pageName: string) {
    const normalized = pageName.trim().toLowerCase();
    if (normalized === 'home') {
        return '/';
    }

    return '/' + normalized.replace(/ /g, '-');
}
