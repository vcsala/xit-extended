export const ALL_DATES_MASK = /([^\w\s\/-]|[ ])-> ([0-9]{4}|[0-9]{4}-W?[0-9]{2}|[0-9]{4}-Q[0-9]|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{4}\/W?[0-9]{2}|[0-9]{4}\/Q[0-9]|[0-9]{4}\/[0-9]{2}\/[0-9]{2})([ ]|$|[^\w\s?\/-])/;
export const FULL_DATE_MASK = /[0-9]{4}-[0-9]{2}-[0-9]{2}/;
export const MONTH_MASK = /[0-9]{4}-[0-9]{2}/;
export const QUARTER_MASK = /[0-9]{4}-Q[1-4]/;
export const ALT_QUARTER_MASK = /[0-9]{4}-Q[0-9]/;
export const WEEK_MASK = /[0-9]{4}-W[0-9]{2}/;
export const YEAR_MASK = /[0-9]{4}/;
export const PRIORITY_MASK = /(?<=^\[[ x@~]\] )((?:!+\.*)|(?:\.*!+)|(?:\.+))(?: |$)/;
export const SHORT_PRIORITY_MASK = /(?<=^\[[ x@~]\] )(?:(?:!+\.*)|(?:\.*!+)|(?:\.+))/;
export const TAG_MASK = /#([\p{L}\p{N}_\-]+)(?:=[\p{L}\p{N}_\-]+|="[^"\n]*"|='[^'\n]*')?/ug;
export const CHECKBOX_MASK = /^\[[ x@~]\](?: |$)/;
export const SIMPLE_CHECKBOX_MASK = /^\[([^\]])*\]/;
export const INDENT_MASK = /^ {4,}\S/;
export const PRIORITY_CHAR_MASK = /!/g;

export const DEFAULT_DATE_SEP = "-";
export const ALT_DATE_SEP = "/";