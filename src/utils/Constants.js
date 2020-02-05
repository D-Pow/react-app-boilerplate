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
    'sandybrown'
];

const mobileBrowserRegexBase = '(android|bb\\d+|meego){}|avantgo|bada\\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\\.(browser|link)|vodafone|wap|windows ce|xda|xiino';
export const MOBILE_BROWSER_REGEX = new RegExp(mobileBrowserRegexBase.replace('{}', '.+mobile'), 'i');
export const MOBILE_OR_TABLET_REGEX = new RegExp(mobileBrowserRegexBase.replace('{}', '|ipad'), 'i');

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email#Basic_validation
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export const LINKS = {
    GitHub: 'https://github.com/'
};
