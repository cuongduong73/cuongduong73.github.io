// BaseParser.js
const MEDIA_URL = 'https://iili.io/'
export class BaseParser {
    constructor(notes) {
        this.notes = notes;
    }

    fixImgSrc(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const imgs = doc.getElementsByTagName('img');
        for (let img of imgs) {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('https://')) {
                img.setAttribute('src', MEDIA_URL + src);
            }
            if (img.hasAttribute('width')) {
                img.removeAttribute('width');
            }
        }
        return doc.body.innerHTML;
    }

    parse() {
        throw new Error('parse() must be implemented by subclass');
    }
}
