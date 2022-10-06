const SPLIT_INTO_TOKENS = /((?:\#[\w\d_-]+\=\"(?:.*?)\"|\#[\w\d_-]+\=\'(?:.*?)\'|\#[\w\d_-]+\=[\w\d_-]+|\#[\w\d_-]+)|(?:-\> (?:\d{4}(?:-\d{2}(?:-\d{2})?)?))|\s+|\[[^\[\]]\])/;
const SPACE = /^\s+$/;
const CHECKBOX = /^\[([^\[\]])\]$/;
const ARROW_OF_TIME = /^-> ([\d]{4}(?:-\d{2}(?:-\d{2})?)?)$/;
const HASH = /^(\#[\w\d_-]+\=\"(?:.*?)\"|\#[\w\d_-]+\=\'(?:.*?)\'|\#[\w\d_-]+\=[\w\d_-]+|\#[\w\d_-]+)$/;
const PRIORITY = /^([\!]+[\.]*|[\!]*[\.]+|[\.]+[\!]*|[\.]*[\!]+)$/;
const STATUSES = {
  ' ': 'open',
  '@': 'ongoing',
  'x': 'checked',
  '~': 'obsolete'
};
const STATUS_SYMBOLS = {
  'open': ' ',
  'ongoing': '@',
  'checked': 'x',
  'obsolete': '~'
};

function tokenize(text: string) {
  function invalidateRole(t) {
    delete t.role;
    delete t.status;
    delete t.priority;
    delete t.date;
    delete t.hash;
  }

  function attachError(token, error) {
    if (!token.errors) {
      token.errors = [];
    }

    token.errors.push(error);
  }

  const tokens = [];
  const lineTokens = [];
  const lines = text.replace(/\r\n/g, "\n").split(/\n/);
  lines.forEach((line, index) => {
    const ln = index + 1;
    let pos = 1;

    const lineToken = { type: "LINE", line: ln, value: line, children: [] };
    if (line.match(/^\s*$/)) {
      lineToken.role = "blank";
    }
    tokens.push(lineToken);
    lineTokens.push(lineToken);

    const wordsAndSpaces = line.split(SPLIT_INTO_TOKENS);
    wordsAndSpaces.forEach((tok) => {
      if (tok === "") return;

      if (tok.match(SPACE)) {
        const token = { type: "SPACE", value: tok, line: ln, pos, parent: lineToken };
        lineToken.children.push(token);
        tokens.push(token);
      } else {
        let matches;
        const token = { type: "WORD", value: tok, line: ln, pos, parent: lineToken };
        lineToken.children.push(token);
        if (matches = tok.match(CHECKBOX)) {
          token.role = "checkbox";
          token.status = matches[1];
        }
        else if (matches = tok.match(ARROW_OF_TIME)) {
          token.role = "date";
          token.date = matches[1];
        }
        else if (matches = tok.match(HASH)) {
          token.role = "hash";
          token.hash = matches[1];
        }
        else if (matches = tok.match(PRIORITY)) {
          token.role = "priority";
          token.priority = matches[1];
        }
        tokens.push(token);
      }
      pos = pos + tok.length;
    });
  });

  lineTokens.forEach(token => {
    const firstChild = token.children[0];
    if (firstChild && firstChild.type === "SPACE") {
      token.indent = firstChild.value.length;
    } else {
      token.indent = 0;
    }

    token.children.forEach((child, index) => {
      if (child.type === "WORD" && child.role === "checkbox") {
        if (index === 0) {
          token.role = "item";
          const statusSymbol = child.status;
          child.status = STATUSES[statusSymbol] ? STATUSES[statusSymbol] : null;

          if (child.status === null) {
            attachError(
              child,
              `"${statusSymbol}" is not a valid status. Valid statuses are: " ", "@", "x" or "~"`
            );
          }

          const nextToken = token.children[1];
          const nextNextToken = token.children[2];

          // if (!nextToken) {
          //   invalidateRole(child);
          //   return;
          // }

          // if (nextToken.type !== "SPACE" || nextToken.value.length > 1) {
          //   invalidateRole(child);
          //   return;
          // }

          // if (!nextNextToken) {
          //   invalidateRole(child);
          //   return;
          // }

          // if (nextNextToken.type !== "WORD") {
          //   invalidateRole(child);
          //   return;
          // }

        } else {
          invalidateRole(child);
        }
      } else if (child.type === "WORD" && child.role === "priority") {
        if (index === 2) {
          const firstSibling = token.children[0];
          const secondSibling = token.children[1];
          if (secondSibling.type === "SPACE" && secondSibling.value.length === 1) {
            if (firstSibling.type === "WORD" && firstSibling.role === "checkbox") {
              let matches;
              if (matches = child.priority.match(/(\!+)/)) {
                child.priority = matches[1].length;
              } else {
                child.priority = null;
              }
            } else {
              invalidateRole(child);
            }
          } else {
            invalidateRole(child);
          }
        }
        else {
          invalidateRole(child);
        }
      }
    });
  });

  let group = 1;
  lineTokens.forEach((token, index) => {
    if (token.role === "blank") {
      group++;
      return;
    }

    token.group = group;

    if (!token.role) {
      if (index === 0 || lineTokens[index - 1].role === "blank") {
        const firstChild = token.children[0];
        if (firstChild && firstChild.type === "WORD" && firstChild.role !== "checkbox") {
          if (firstChild.value.match(/^[\d\w]/)) {
            token.role = "group-title";
          }
        }
      }
      if (token.children) {
        token.children.forEach(child => { child.group = group; });
      }
      return;
    };

    if (token.role !== "item") { return; }
    token.item = token;

    let firstDueDate;
    token.children.forEach(child => {
      child.item = token;
      child.group = group;
      if (child.role === "date") {
        if (!firstDueDate) {
          firstDueDate = child;
        } else {
          invalidateRole(child);
        }
      }
    });

    for (let i = index + 1; i < lineTokens.length; i++) {
      const line = lineTokens[i];
      if (line.indent < 4 || line.role === "blank") {
        break;
      }
      line.role = "item-description";
      line.item = token;
      line.children.forEach(child => {
        child.item = token;
        child.group = group;
        if (child.role === "date") {
          if (!firstDueDate) {
            firstDueDate = child;
          } else {
            invalidateRole(child);
          }
        }
      });
    }
  })

  lineTokens.forEach(token => {
    if (!token.role) {
      token.role = "item";
      token.item = token;
    }

    if (token.role === "item") {
      if (token.value.match(/^\s+/)) {
        attachError(token, "Item must not begin with blank characters");
      }

      if (!token.value.match(/^\[.\]/)) {
        attachError(token, "Item must begin with a valid checkbox");
      } else {
        if (!token.value.match(/^\[.\]\s+[^\s]/)) {
          attachError(token, "Checkbox must be followed by a space, an optional priority followed by one or more spaces and a description");
        } else {
          if (token.value.match(/^\[.\]\s([\!]+[\.]*|[\!]*[\.]+|[\.]+[\!]*|[\.]*[\!]+)\s*$/)) {
            attachError(token, "Priority must be followed by one or more spaces and a description");
          }
        }
      }
    }
  });

  tokens.forEach((token, index) => {
    if (token.type === "WORD" && token.role) {
      const prev = tokens[index - 1];
      const next = tokens[index + 1];
      if (prev) {
        if (prev.type === "WORD") {
          if (prev.value.match(/[\#\d\w\"\-\']$/)) {
            invalidateRole(token);
          }
        }
      }
      if (next) {
        if (next.type === "WORD") {
          if (next.value.match(/^[\#\d\w\"\-\']/)) {
            invalidateRole(token);
          }
        }
      }
    }
  })

  return tokens;
}

function parse(tokens) {
  const groups = [];
  let cg;
  let group;
  let processedItems = [];

  tokens.forEach((token, index) => {
    if (token.type !== "LINE") return;
    if (token.role === "blank") return;
    if (token.item && processedItems.indexOf(token.line) > -1) return;

    if (cg !== token.group) {
      if (cg !== undefined) {
        if (group.title || group.items.length > 0) {
          groups.push(group);
        }
      }
      cg = token.group;
      group = { items: [] };
    };

    if (token.role === "group-title") group.title = token.value;
    if (token.role === "item") {
      const item = {
        status: null,
        title: null,
        description: [],
        tags: [],
        dueDate: null,
        priority: null
      };

      for (let i = index; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.type === "LINE") {
          if (t.item !== token) {
            processedItems.push(token.line);
            break;
          }

          if (t.role === "item") {
            item.title = t.value;
          } else if (t.role === "item-description") {
            item.description.push(t.value.slice(4));
          }
        }

        else if (t.type === "WORD") {
          if (t.role === "checkbox") {
            item.status = t.status;
          } else if (t.role === "priority") {
            item.priority = t.priority;
          } else if (t.role === "date") {
            item.dueDate = t.date;
          } else if (t.role === "hash") {
            item.tags.push(t.hash);
          }
        }
      }

      group.items.push(item);
    }
  });

  if (group.title || group.items.length > 0) {
    groups.push(group);
  }

  const errors = [];
  tokens.forEach(token => {
    if (!token.errors || token.errors.length < 1) return;
    token.errors.forEach(error => {
      errors.push({
        message: error,
        line: token.type === "LINE" ? token.value : (token.parent ? token.parent.value : token.value),
        start: {
          line: token.line,
          pos: token.pos
        },
        end: {
          line: token.line,
          pos: token.pos ? (token.pos + token.value.length - 1) : undefined
        }
      });
    });
  });

  return { groups, errors };
}

function printable(tokenlist) {
  return tokenlist.map(token => {
    const t = { ...token };
    if (t.children) t.children = `${t.children.length} children`;
    if (t.parent) t.parent = t.parent.line;
    if (t.item) t.item = t.item.line;
    return t;
  });
}

const {
  performance
} = require('perf_hooks');

const texxts = `[ ] Item without headline/grouping
[ ] 
[ ]

Checkboxes
[ ] Open item
[x] Checked item
[@] Ongoing (doing / in progress)
[~] Obsolete item

NOT Checkboxes
[e] Foo
[ ]Foo
[  ] Foo

Description
[ ] Item descriptions can span multiple
    lines. Indentation must be 4 spaces.
[x] Other special characters *can* be used
    (but don’t have pre-defined meaning)
[~] The highlighting style of the item
    must be carried over to the subsequent
    lines of the description.

[ ] Single item in between (with an indented blankline below)
    
Tags
[ ] Item with #tag in the #text, for #categorising:#things.
[@] #nodescription
[x] That should also work on...
    ...subsequent #lines.
[x] Tags can #have=values, which can also
    #be="quoted" (#example='.! #foo').

NOT Tags
[ ] This is not a#tag
[ ] Where is the #closing="quote?
[ ] Where is the #closing='quote?

Empty group

Due Date
[ ] Do this -> 2018-05-14
[ ] Or with month only -> 2022-03
[ ] Or with year only -> 2022
[ ] Or with week -> 2022-W22
[ ] -> 2022-03-14 Due date can also be at beginning
[ ] Or in -> 2022-03-14 between
[x] Or in the...
    ...next line: -> 2022-03
[ ] Hyphens can also be slashes -> 2018/05/14
[~] -> 2022-03-14
[ ] Punctuation can follow -> 2022-05-03.
[ ] Punctuation be all around (-> 2022-05-03)

NOT Due Dates
[ ] No trailing dash -> 2022-05-03-
[ ] No traling slash -> 2022-05-03/

Priority
[ ] ! This is important
[ ] !!! This is very important
[ ] !!!!!!!! Priority level can be arbitrary
[ ] ! ! ! . Only the first ! . one is the priority
[ ] !.. Dots can be filled in for visual alignment
[x] ... It can also be all dots
[x] ..! The exclamation can be at the end
[@] !
[~] .

NOT Priorities
[ ] !!!There has to be a space in between
[ ] !.! But not mixed (that’s just description)
[ ] .!. Neither is this priority
[ ]! Not cool

Lexicographic sorting
[ ] !! -> 2016-05-02 All items within this group are sorted...
[ ] .! -> 2009-01-01 ...lexicographically. This implies the
[ ] .! -> 2012-07-28 following hierarchy: open items first, then
[ ] .! -> 2017-12-31 ongoing, then done, lastly obsolete ones.
[@] .. -> 2015-08-14 Within those kinds, the high-priority ones
[x] !! -> 2000-02-06 come first. Within the priority levels, it’s
[~] !! -> 1970-11-11 sorted by due date, starting with the nearest.

NOT Anything

[ ] Headline cannot appear
Underneatch an item

    [ ] Items cannot be indented

 Neither can headlines

[x Foo

[]

[5]

[ ] “Subitems”...
    [ ] are not recognised as item
`;

const t0 = performance.now();
const output = parse(tokenize(texxts));
const t1 = performance.now();
console.log(JSON.stringify(output, undefined, 2));
// console.log("Performance: ", t1 - t0);