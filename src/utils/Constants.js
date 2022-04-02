export const COLORS = [
    'red',
    'blue',
    'purple',
    'pink',
    'orange',
    'green',
    'yellow',
    'gray',
    'teal',
    'cyan',
    'indigo',
    'darkblue',
    'deepskyblue',
    'lawngreen',
    'maroon',
    'magenta',
    'rosybrown',
    'royalblue',
    'salmon',
    'sandybrown',
];


/**
 * Mappings from file extension to MIME type (aka Media type).
 * Also contains some other common keys (like FORM_DATA).
 *
 * Only includes some MIME types since the number of both native and vendor types is huge.
 *
 * @type {Object<string, string>}
 * @see [MDN docs]{@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types}
 * @see [Wikipedia docs]{@link https://en.wikipedia.org/wiki/Media_type}
 */
export const MimeTypes = {
    // Web assets
    HTML: 'text/html',
    CSS: 'text/css',
    JS: 'application/javascript',
    // Text
    JSON: 'application/json',
    XML: 'application/xml',
    TEXT: 'text/plain;charset=utf-8',
    TXT: 'text/plain',
    CSV: 'text/csv',
    // Requests
    FORM_DATA: 'application/x-www-form-urlencoded', // Use this instead of FORM_DATA_BINARY if binary data is Base64-encoded
    FORM_DATA_BINARY: 'multipart/form-data', // Technically could also be FORM_DATA but formatted differently than a URL (somewhat uncommon nowadays)
    // Photos
    SVG: 'image/svg+xml',
    PNG: 'image/png',
    JPEG: 'image/jpeg',
    GIF: 'image/gif',
    WEBP: 'image/webp',
    ICO: 'image/x-icon',
    // Audio
    MP3: 'audio/mp3',
    WAV: 'audio/wav',
    // Video
    MP4: 'video/mp4',
    // Binary
    STREAM: 'application/octet-stream',
    ZIP: 'application/zip',
    EXECUTABLE: 'application/x-executable',
    // Documents (specific binaries)
    PDF: 'application/pdf',
    ODT: 'application/vnd.oasis.opendocument.text',
    DOC: 'application/msword',
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    XLS: 'application/vnd.ms-excel',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    PPT: 'application/vnd.ms-powerpoint',
    PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};


const mobileBrowserRegexBase = '(android|bb\\d+|meego){}|avantgo|bada\\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\\.(browser|link)|vodafone|wap|windows ce|xda|xiino';
export const MOBILE_BROWSER_REGEX = new RegExp(mobileBrowserRegexBase.replace('{}', '.+mobile'), 'i');
export const MOBILE_OR_TABLET_REGEX = new RegExp(mobileBrowserRegexBase.replace('{}', '|ipad'), 'i');


// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email#Basic_validation
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;


export const LINKS = {
    GitHub: 'https://github.com/',
    EmbeddedFileViewerGoogle: 'https://docs.google.com/viewer?embedded=true&url=',
    EmbeddedFileViewerMicrosoft: 'http://view.officeapps.live.com/op/view.aspx?src=',
    BadgeShieldGenerator: 'https://img.shields.io/badge',
};


export const UPDATE_BROADCAST = 'UPDATE';
