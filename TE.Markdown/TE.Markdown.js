/*!
 * ==========================================================
 *  MARKDOWN TEXT EDITOR PLUGIN 1.1.1
 * ==========================================================
 * Author: Taufik Nurrohman <https://github.com/tovic>
 * License: MIT
 * ----------------------------------------------------------
 */

TE.Markdown = function(target, o) {

    var _u2026 = '\u2026', // horizontal ellipsis
        _u2193 = '\u2193', // downwards arrow
        _u2318 = '\u2318', // command sign

        win = window,
        doc = document,
        editor = new TE.HTML(target, {
            extra: 0, // enable **Markdown Extra** feature
            auto_p: 0, // disable automatic paragraph feature from `TE.HTML` by default
            auto_close: {
                '`': '`'
            },
            states: {
                a: {
                    "": [""] // implicit link name shortcut (do not remove!)
                },
                img: {}
            },
            languages: {
                tools: {
                    sup: 'Footnote (' + _u2318 + '+' + _u2193 + ')'
                },
                modals: {
                    a: {
                        title: ['Link URL/Reference ID']
                    },
                    img: {
                        title: ['Image URL/Reference ID']
                    },
                    sup: {
                        title: 'Footnote ID'
                    }
                }
            },
            advance_br: 1, // press `⇧+↵` to do a hard break
            'advance_h1,h2': 1, // enable **SEText** header style
            'advance_pre,code': 1, // replace with `true` or `%1 .foo` to enable fenced code block syntax in **Markdown Extra**
            'close_h1,h2,h3,h4,h5,h6': 0, // replace with `true` for `### heading 3 ###`
            close_tr: 0, // enable closed table pipe
            formats: {
                b: '**',
                i: '_',
                s: '~~',
                h1: ['=', '#'],
                h2: ['-', '##'],
                h3: '###',
                h4: '####',
                h5: '#####',
                h6: '######',
                blockquote: '>',
                code: ['`', '~'],
                ul: '-',
                ol: '%1.',
                hr: '---'
            }
        }),
        ui = editor.ui,
        extend = editor._.extend,
        each = editor._.each,
        esc = editor._.x,
        format = editor._.format,
        attrs = '(?:\\s[^<>]*?)?',
        attrs_capture = '(|\\s[^<>]*?)',
        content = '([\\s\\S]*?)',
        TAB = '\t';

    // define editor type
    editor.type = 'Markdown';

    var config = extend(editor.config, o),
        states = config.states,
        languages = config.languages,
        formats = config.formats,
        classes = config.classes,
        tab = config.tab,
        suffix = config.suffix,
        placeholder = languages.placeholders[""],
        header_step = 0,
        extra = config.extra,
        bullet_any = '( +[' + esc(formats.ul + '*+-') + '] )';

    if (!extra) {
        config['advance_pre,code'] = 0;
    }

    function is_set(x) {
        return typeof x !== "undefined";
    }

    function is_node(x) {
        return x instanceof HTMLElement;
    }

    function is_string(x) {
        return typeof x === "string";
    }

    function is_function(x) {
        return typeof x === "function";
    }

    function is_object(x) {
        return typeof x === "object";
    }

    function is_number(x) {
        return typeof x === "number";
    }

    function pattern(a, b) {
        return new RegExp(a, b);
    }

    function trim(s) {
        return s.replace(/^\s*|\s*$/g, "");
    }

    function trim_right(s) {
        return s.replace(/\s+$/, "");
    }

    function edge(a, b, c) {
        if (a < b) return b;
        if (a > c) return c;
        return a;
    }

    function attr_value(s) {
        return force_i(s).replace(/<.*?>/g, "").replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }

    function force_i(s) {
        return trim(s.replace(/\s+/g, ' '));
    }

    editor.mark = function(str, wrap, gap_1, gap_2) {
        if (!is_object(str)) str = [str];
        if (!is_set(gap_1)) gap_1 = ' ';
        if (!is_set(gap_2)) gap_2 = "";
        var s = editor[0]().$(),
            a = str[0] + gap_2,
            b = gap_2 + (is_set(str[1]) ? str[1] : str[0]),
            c = s.value,
            A = esc(a),
            B = esc(b),
            m = pattern('^' + A + '([\\s\\S]*?)' + B + '$'),
            m_A = pattern(A + '$'),
            m_B = pattern('^' + B),
            before = s.before,
            after = s.after;
        if (!c) {
            editor.insert(placeholder);
        } else {
            gap_1 = false;
        }
        return editor.toggle(
            // when ...
            wrap ? !m.test(c) : (!m_A.test(before) && !m_B.test(after)),
            // do ...
            [
                // first toggle
                function($) {
                    $.unwrap(a, b, 1).tidy(/<[^\/<>]+?>$/.test(before) ? "" : gap_1, /^<\/[^<>]+?>/.test(after) ? "" : gap_1).wrap(a, b, wrap)[1]();
                },
                // second toggle (the reset state)
                function($) {
                    $.unwrap(a, b, wrap)[1]();
                }
            ]
        );
    };

    extend(ui.tools, {
        b: {
            i: 'bold',
            click: function(e, $) {
                return $.i().mark(formats.b), false;
            }
        },
        i: {
            i: 'italic',
            click: function(e, $) {
                return $.i().mark(formats.i), false;
            }
        },
        u: 0,
        s: extra ? {
            i: 'strikethrough',
            click: function(e, $) {
                return $.i().mark(formats.s), false;
            }
        } : 0,
        a: {
            i: 'link',
            click: function(e, $) {
                var s = $.$(),
                    b = s.before,
                    x = s.value,
                    a = s.after,
                    g = $.get(),
                    n = /^ {0,3}\[[^\^]+?\]:/.test(g.split('\n').pop()) ? '\n' : '\n\n',
                    links = g.match(/^ {0,3}\[[^\^]+?\]:/gm) || [],
                    i18n = languages.modals.a,
                    http = i18n.placeholder[0],
                    state, href, title, index, start, end, i;
                // automatic link
                if (/^([a-z]+:\/\/\S+|<[a-z]+:\/\/\S+>)$/.test(x)) {
                    return $.tidy(' ').mark(['<', '>'], 1), false;
                }
                // collect all embedded reference link(s)
                for (i in links) {
                    i = ' ' + trim(links[i]).replace(/^\[|\]:$/g, "");
                    states.a[i] = 1;
                }
                state = states.a;
                return $.record().ui.prompt(['a[href]', i18n.title[0]], http, 0, function(e, $, v) {
                    var implicit = v === "";
                    v = force_i(v);
                    $[0]();
                    if (state[v]) {
                        $.trim(trim(b) ? ' ' : "", /^\n+ {0,3}\*?\[/.test(a) ? false : ' ').mark(['[', '][' + v + ']'], 0, false);
                        index = links.indexOf(' [' + v + ']:');
                        if (index === -1 && state[v] !== 1) {
                            s = $.$();
                            b = s.before;
                            start = s.start;
                            end = s.end;
                            $.set(b + s.value + trim_right(s.after) + n + ' [' + (v || trim(x) || placeholder) + ']: ' + (!implicit ? state[v][0] + (state[v][1] ? ' "' + state[v][1] + '"' : "") : "")).select(start, end);
                            if (implicit) $.focus(true).insert(http);
                        }
                    } else {
                        href = v;
                        $.blur().ui.prompt(['a[title]', i18n.title[1]], i18n.placeholder[1], 0, function(e, $, v) {
                            title = attr_value(v);
                            if (!x) {
                                $.insert(placeholder);
                            }
                            $.i().trim(trim(b) ? ' ' : "", !trim(a) ? "" : (/^\n+ {0,3}\*?\[/.test(a) ? '\n\n ' : ' ')).wrap('[', '](' + href + (title ? ' "' + title + '"' : "") + ')');
                        });
                    }
                    $[1]();
                }), false;
            }
        },
        img: {
            i: 'image',
            click: function(e, $) {
                var s = $.$(),
                    alt = s.value,
                    b = s.before,
                    a = s.after,
                    g = $.get(),
                    n = /^ {0,3}\[[^\^]+?\]:/.test(g.split('\n').pop()) ? '\n' : '\n\n',
                    images = g.match(/^ {0,3}\[[^\^]+?\]:/gm) || [],
                    i18n = languages.modals.img,
                    keep = /^\n* {0,3}\[.+?\]:/.test(a) ? ' ' : "",
                    A = trim(a),
                    state, src, title, index, start, end;
                // collect all embedded reference image(s)
                for (i in images) {
                    i = ' ' + trim(images[i]).replace(/^\[|\]:$/g, "");
                    !states.img[i] && (states.img[i] = 1);
                }
                state = states.img;
                return $.ui.prompt(['img[src]', i18n.title[0]], i18n.placeholder[0], 1, function(e, $, v) {
                    v = force_i(v);
                    src = v;
                    if (!alt) {
                        alt = src.split(/[\/\\\\]/).pop();
                    }
                    alt = attr_value(alt);
                    $[0]().trim(trim(b) ? '\n\n' : "", keep).insert("");
                    if (state[v]) {
                        $.insert('![' + alt + '][' + v + ']\n\n', -1);
                        if (keep) $.select($.$().start);
                        index = images.indexOf(' [' + v + ']:');
                        if (index === -1) {
                            s = $.$();
                            b = s.before;
                            start = s.start;
                            end = s.end;
                            $.set(b + s.value + s.after + (A ? n : "") + ' [' + v + ']: ' + state[v][0] + (state[v][1] ? ' "' + state[v][1] + '"' : "")).select(start, end);
                        }
                    } else {
                        $.blur().ui.prompt(['img[title]', i18n.title[1]], i18n.placeholder[1], 0, function(e, $, v) {
                            title = attr_value(v);
                            $.insert('![' + alt + '](' + src + (title ? ' "' + title + '"' : "") + ')\n\n', -1);
                            if (keep) $.select($.$().start);
                        });
                    }
                    $[1]();
                }), false;
            }
        },
        sub: 0,
        sup: extra ? {
            i: 'thumb-tack',
            click: function(e, $) {
                var s = $.$(),
                    b = s.before,
                    a = s.after,
                    i18n = languages.modals.sup,
                    g = $.get(),
                    n = /^ {0,3}\[\^.+?\]:/.test(g.split('\n').pop()) ? '\n' : '\n\n',
                    notes = g.match(/^ {0,3}\[\^.+?\]:/gm) || [],
                    i = 0, index;
                for (i in notes) {
                    notes[i] = ' ' + trim(notes[i]);
                }
                i = notes.length + 1;
                return $.ui.prompt(['sup[id]', i18n.title], s.value || i18n.placeholder || i, 0, function(e, $, v) {
                    v = trim(v) || i;
                    index = notes.indexOf(' [^' + v + ']:');
                    if (index !== -1) {
                        i = g.indexOf(notes[index]) + 3;
                        $.select(i, i + v.length);
                    } else {
                        $.trim(trim(b) ? ' ' : "", !trim(a) || /^\n+ {0,3}\*?\[/.test(a) ? '\n\n ' : ' ').insert('[^' + v + ']').set(trim_right($.get()) + n + ' [^' + v + ']: ').focus(true).insert(placeholder);
                    }
                }), false;
            }
        } : 0,
        abbr: extra ? {
            i: 'question',
            click: function(e, $) {
                var s = $.$(),
                    x = trim(s.value),
                    i18n = languages.modals.abbr,
                    g = $.get(),
                    abbr = trim(x || placeholder),
                    n = /^ {0,3}\*\[.+?\]:/.test(g.split('\n').pop()) ? '\n' : '\n\n',
                    abbrs = g.match(/^ {0,3}\*\[.+?\]:/gm) || [],
                    state = states.abbr,
                    i = 0;
                for (i in abbrs) {
                    abbrs[i] = ' ' + trim(abbrs[i]);
                }
                i = abbrs.indexOf(' *[' + abbr + ']:');
                if (x && i !== -1) {
                    i = g.indexOf(abbrs[i]) + 3;
                    return $.select(i, i + abbr.length), false;
                }
                return $.record().ui.prompt(['abbr[title]', i18n.title], state[abbr] || i18n.placeholder, !state[x], function(e, $, v, w) {
                    v = trim(v);
                    $.set(trim_right($.get()) + (s.before || x ? n : "") + ' *[' + abbr + ']: ').focus(true).insert(v || w);
                    if (abbr === placeholder) {
                        var a = $.$().start;
                        $.select(a - 3 - abbr.length, a - 3);
                    }
                }), false;
            }
        } : 0,
        p: {
            i: 'paragraph',
            click: function(e, $) {
                return $.tidy('\n\n').insert(placeholder), false;
            }
        },
        'p,h1,h2,h3,h4,h5,h6': {
            i: 'header',
            click: function(e, $) {
                if (header_step > 5) {
                    header_step = 0;
                } else {
                    header_step++;
                }
                var s = $.$(),
                    setext = config['advance_h1,h2'],
                    setext_esc = '\\s?[' + esc(formats.h1[0] + formats.h2[0]) + ']+\\s*',
                    h1 = esc(formats.h1[1]),
                    clean_B = s.before.replace(pattern('[' + h1 + '\\s]+$'), ""),
                    clean_V = force_i(s.value).replace(pattern('^[' + h1 + '\\s]+|[' + h1 + '\\s]+$', 'g'), "").replace(pattern(setext_esc + '$'), "") || placeholder,
                    clean_A = s.after.replace(pattern('^[' + h1 + '\\s]+'), "").replace(pattern('^' + setext_esc), ""),
                    H = [
                        "",
                        formats.h1[setext ? 0 : 1],
                        formats.h2[setext ? 0 : 1],
                        formats.h3,
                        formats.h4,
                        formats.h5,
                        formats.h6
                    ];
                $[0]().set(clean_B + clean_V + clean_A).select(clean_B.length, (clean_B + clean_V).length).tidy('\n\n');
                if (header_step === 0) {
                    // do nothing ...
                } else if (header_step < 3 && setext) {
                    $.wrap("", '\n' + clean_V.replace(/./g, H[header_step]));
                } else {
                    $.wrap(H[header_step] + ' ', config['close_h1,h2,h3,h4,h5,h6'] ? ' ' + H[header_step] : "");
                }
                return $[1](), false;
            }
        },
        'blockquote,q': {
            i: 'quote-left',
            click: function(e, $) {
                var s = $.$(),
                    v = s.value,
                    blockquote = formats.blockquote;
                if (v === placeholder) {
                    return $.select(), false;
                }
                if (!v) {
                    return $[0]().tidy('\n\n').insert(blockquote + ' ', -1).insert(placeholder)[1](), false;
                }
                return $.tidy(pattern(blockquote + ' $').test(s.before) ? false : '\n\n')[pattern('^' + blockquote).test(v) ? 'outdent' : 'indent'](blockquote + ' '), false;
            }
        },
        'pre,code': {
            i: 'code',
            click: function(e, $) {
                var s = $.$(),
                    b = s.before,
                    v = s.value,
                    pre = config['advance_pre,code'],
                    code = formats.code,
                    p = code[1] || code[0];
                p = p + p + p; // repeat three times
                if (!is_string(pre) && pre) {
                    pre = p;
                } else if (is_string(pre) && pre.indexOf('%1') !== -1) {
                    pre = format(pre, [p]);
                }
                var dents = '( {4,}|\\t' + (is_string(pre) ? '|' + esc(pre) : "") + ')';
                // block
                if (pattern('(^|\\n)' + dents + '?$').test(b)) {
                    if (pre) {
                        return $.mark([pre, pre.split(/\s+/)[0]], 0, '\n\n', '\n'), false;
                    }
                    pre = tab === TAB ? TAB : '    ';
                    if (!v) {
                        $[0]().tidy('\n\n');
                        var t = $.$().start,
                            str = pre + placeholder;
                        return $.insert(str).select(t + pre.length, t + str.length)[1](), false;
                    } else if(v === placeholder && pattern(dents + '$').test(b)) {
                        return $.select(s.start - pre.length, s.end), false;
                    }
                    return $.tidy('\n\n')[pattern('^' + dents).test(v) ? 'outdent' : 'indent'](pre), false;
                }
                // span
                return $.mark(code[0]), false;
            }
        },
        ul: {
            i: 'list-ul',
            click: function(e, $) {
                var s = $.$(),
                    v = s.value,
                    b = s.before, B,
                    a = s.after,
                    ul = formats.ul,
                    ol = formats.ol,
                    esc_ul = esc(ul),
                    esc_ol = format(esc(ol), ['\\d+']),
                    bullet = pattern('(^|\\n)([\\t ]*) ' + esc_ul + ' (.*)$'),
                    bullet_s = pattern('^(.*) ' + esc_ul + ' ', 'gm'),
                    list = pattern('(^|\\n)([\\t ]*) ' + esc_ol + ' (.*)$'),
                    list_s = pattern('^(.*) ' + esc_ol + ' ', 'gm');
                if (!v) {
                    if (b && a) {
                        // ordered list detected
                        if (list.test(b)) {
                            B = b.replace(list, '$1$2 ' + ul + ' $3');
                        // unordered list detected
                        } else if (bullet.test(b)) {
                            B = b.replace(bullet, '$1$2$3');
                        // plain text ...
                        } else {
                            B = b.replace(/(^|\n)(\s*)([^\n]*)$/, '$1$2 ' + ul + ' $3');
                        }
                        return $.set(B + a).select(B.length), false;
                    }
                    return $[0]().tidy('\n\n').insert(' ' + ul + ' ', -1).insert(placeholder)[1](), false;
                } else {
                    // start ...
                    if (v === placeholder) {
                        $.select();
                    // ordered list detected
                    } else if (list_s.test(v)) {
                        $.replace(list_s, '$1 ' + ul + ' ');
                    // unordered list detected
                    } else if (bullet_s.test(v)) {
                        $[0]().replace(bullet_s, '$1');
                    // plain text ...
                    } else {
                        $.replace(/^(\s*)(\S.*)$/gm, '$1 ' + ul + ' $2');
                    }
                    return false;
                }
            }
        },
        ol: {
            i: 'list-ol',
            click: function(e, $) {
                var s = $.$(),
                    v = s.value,
                    b = s.before, B,
                    a = s.after,
                    ul = formats.ul,
                    ol = formats.ol,
                    ol_first = format(ol, [1]),
                    esc_ul = esc(ul),
                    esc_ol = format(esc(ol), ['\\d+']),
                    bullet = pattern('(^|\\n)([\\t ]*) ' + esc_ul + ' (.*)$'),
                    bullet_s = pattern('^(.*) ' + esc_ul + ' ', 'gm'),
                    list = pattern('(^|\\n)([\\t ]*) ' + esc_ol + ' (.*)$'),
                    list_s = pattern('^(.*) ' + esc_ol + ' ', 'gm'),
                    i = 0;
                if (!v) {
                    if (b && a) {
                        // unordered list detected
                        if (bullet.test(b)) {
                            B = b.replace(bullet, '$1$2 ' + ol_first + ' $3');
                        // ordered list detected
                        } else if (list.test(b)) {
                            B = b.replace(list, '$1$2$3');
                        // plain text ...
                        } else {
                            B = b.replace(/(^|\n)(\s*)([^\n]*)$/, '$1$2 ' + ol_first + ' $3');
                        }
                        return $.set(B + a).select(B.length), false;
                    }
                    return $[0]().tidy('\n\n').insert(' ' + ol_first + ' ', -1).insert(placeholder)[1](), false;
                } else {
                    // start ...
                    if (v === placeholder) {
                        $.select();
                    // unordered list detected
                    } else if (bullet_s.test(v)) {
                        $.replace(bullet_s, function(a, b, c) {
                            return ++i, b + ' ' + format(ol, [i]) + ' ';
                        });
                    // ordered list detected
                    } else if (list_s.test(v)) {
                        $[0]().replace(list_s, '$1');
                    // plain text ...
                    } else {
                        $.replace(/^(\s*)(\S.*)$/gm, function(a, b, c) {
                            return ++i, b + ' ' + format(ol, [i]) + ' ' + c;
                        });
                    }
                    return false;
                }
            }
        },
        table: extra ? function(e, $) {
            var str = states.tr,
                std = states.td,
                i18n = languages.modals.table,
                p = languages.placeholders.table,
                q = format(p[0], [1, 1]),
                o = [], s, c, r;
            if ($.$().value === q) return $.select(), false;
            return $[0]().insert("").ui.prompt(['table>td', i18n.title[0]], i18n.placeholder[0], 0, function(e, $, v, w) {
                c = edge(parseInt(v, 10) || w, std[0], std[1]);
                $.blur().ui.prompt(['table>tr', i18n.title[1]], i18n.placeholder[1], 0, function(e, $, v, w) {
                    r = edge(parseInt(v, 10) || w, str[0], str[1]);
                    var i, j, k, l, m, n;
                    for (i = 0; i < r; ++i) {
                        s = '|';
                        for (j = 0; j < c; ++j) {
                            s += ' ' + format(p[1], [i + 1, j + 1]) + ' |';
                        }
                        o.push(s);
                    }
                    o = o.join('\n');
                    s = '|';
                    for (k = 0; k < r; ++k) {
                        s += ' ' + format(p[0], [k + 1, k + 1]).replace(/./g, '-') + ' |';
                    }
                    o = s + '\n' + o;
                    s = '|';
                    for (l = 0; l < r; ++l) {
                        s += ' ' + format(p[0], [1, l + 1]) + ' |';
                    }
                    o = s + '\n' + o;
                    if (!config.close_tr) {
                        o = o.replace(/^\|\s*|\s*\|$/gm, "");
                    }
                    $.tidy('\n\n').insert(o, 1);
                    m = $.$();
                    n = m.start + m.after.indexOf(q);
                    $.select(n, n + q.length)[1]();
                });
            }), false;
        } : 0,
        hr: {
            i: 'ellipsis-h',
            click: function(e, $) {
                return $.tidy('\n\n', "").insert(formats.hr + '\n\n', -1), false;
            }
        }
    });

    each(ui.tools, function(v, i) {
        var title = languages.tools[i] || "";
        if (is_function(v)) {
            ui.tools[i] = {
                title: title,
                click: v
            }
        } else {
            if (!v.title) v.title = title;
        }
    });

    extend(ui.keys, {
        'control+u': 0,
        'control+arrowup': 'sup',
        'control+arrowdown': 'sup',
        'control+shift+?': 'abbr',
        'shift+enter': function(e, $) {
            var br = config.advance_br;
            if (!is_string(br) && br) {
                br = '  \n';
            }
            return $.trim().insert(br || '\n', -1), false;
        },
        'enter': function(e, $) {
            var s = $.$(),
                blockquote = formats.blockquote,
                ul = formats.ul,
                ol = formats.ol,
                esc_ol = format(esc(ol), ['\\d+']),
                regex = '((' + esc(blockquote) + ' )+|' + bullet_any + '| +(' + esc_ol + ') )',
                match = pattern('^' + regex + '.*$', 'gm').exec(s.before.split('\n').pop());
            if (match) {
                if (match[0] === match[1]) {
                    return $.outdent(pattern(regex)), false;
                } else if (pattern('\\s*' + esc_ol + '\\s*').test(match[1])) {
                    var i = parseInt(trim(match[1]), 10);
                    return $.insert('\n' + match[1].replace(/\d+/, i + 1), -1).scroll('+1'), false;
                }
                return $.insert('\n' + match[1], -1).scroll('+1'), false;
            }
        },
        'shift+tab': function(e, $) {
            var s = $.$(),
                b = s.before,
                v = s.value,
                a = s.after,
                ol = formats.ol,
                esc_ol = esc(ol),
                esc_ol_any = format(esc_ol, ['\\d+']),
                esc_blockquote = esc(formats.blockquote),
                bullets = pattern('  ' + bullet_any + '$'),
                lists = pattern('   ( ?' + esc_ol_any + ' )$'),
                dents = '(' + esc_blockquote + ' |' + bullet_any + '| +' + esc_ol_any + ' )',
                match;
            if (!v) {
                if (match = b.match(pattern(esc_blockquote + ' $'))) {
                    return $.outdent(match[0]), false;
                } else if (match = b.match(bullets)) {
                    b = b.replace(bullets, '$1');
                    return $.set(b + a).select(b.length), false;
                } else if (match = b.match(lists)) {
                    b = b.replace(lists, '$1');
                    return $.set(b + a).select(b.length), false;
                }
            } else if (v && (match = v.match(pattern('(^|\\n)' + dents, 'g')))) {
                return $.outdent(pattern(dents)), false;
            }
            return ui.tools.outdent.click(e, $);
        },
        'tab': function(e, $) {
            var s = $.$(),
                b = s.before,
                v = s.value,
                a = s.after,
                ol = formats.ol,
                esc_ol = esc(ol),
                bullets = pattern(bullet_any + '$'),
                lists = pattern(' ?' + format(esc_ol, ['\\d+']) + ' $'),
                match;
            if (!v) {
                if (match = b.match(pattern(esc(formats.blockquote) + ' $'))) {
                    return $.insert(match[0], -1), false;
                } else if (match = b.match(bullets)) {
                    b = b.replace(bullets, '  $1');
                    return $.set(b + a).select(b.length), false;
                } else if (match = b.match(lists)) {
                    b = b.replace(lists, '    ' + format(ol, [1]) + ' ');
                    return $.set(b + a).select(b.length), false;
                }
            }
            return ui.tools.indent.click(e, $);
        }
    });

    return editor.update(extend({
        tools: 'b i s | a img | sup abbr | p,h1,h2,h3,h4,h5,h6 | blockquote,q pre,code | ul ol | indent outdent | table | hr | undo redo'
    }, o), 0);

};