Ext.ns('CustomFields.field');

CustomFields.field.CityHierarchyTree = function (config) {
    this.hiddenField   = config.hiddenField;
    this.currentValue = (config.value || '')
        .split('||')
        .map(v => v.trim())
        .filter(Boolean);
    
    this.renderTo      = config.renderTo;

    this.nodeTitles    = {};
    this.maxSelected   = config.maxSelected || 2;
    this.lastFoundNode = null;

    this.render();
};

CustomFields.field.CityHierarchyTree.prototype = {

    /* ===================== RENDER ===================== */

    render: function () {

        this.fakeInput = Ext.DomHelper.append(this.renderTo, {
            tag: 'div',
            cls: 'city-select-input',
            html: '<span class="city-placeholder">Выбрать город</span>'
        }, true);

        this.chipsWrap = Ext.DomHelper.append(this.fakeInput, {
            tag: 'div',
            cls: 'city-chips'
        }, true);

        this.fakeInput.on('click', this.openMenu, this);

        this.loadInitialTitles();
        this.renderChips();
        this.updatePlaceholder();
    },

    sync: function () {
        if (this.hiddenField) {
            this.hiddenField.value = this.currentValue.join('||');
        }
        this.renderChips();
        this.updatePlaceholder();
    },

    updatePlaceholder: function () {
        if (!this.fakeInput) return;
    
        if (this.currentValue.length) {
            this.fakeInput.addClass('has-value');
        } else {
            this.fakeInput.removeClass('has-value');
        }
    },
    
    /* ===================== MENU ===================== */

    openMenu: function (e) {
        e.stopEvent();

        if (!this.menu) {
            this.buildMenu();
        }

        this.menu.showAt(this.fakeInput.getXY());

        Ext.defer(function () {
            this.searchField.focus(false);
        }, 50, this);
    },

    buildMenu: function () {

        /* ---- SEARCH FIELD ---- */

        this.searchField = new Ext.form.TextField({
            emptyText: 'Поиск города…',
            cls: 'city-search-field',
            enableKeyEvents: true,
            listeners: {
                keyup: {
                    fn: this.onSearch,
                    scope: this,
                    buffer: 250
                },
                specialkey: {
                    fn: this.onSearchEnter,
                    scope: this
                }
            }
        });

        /* ---- TREE ---- */

        this.tree = new Ext.tree.TreePanel({
            rootVisible: false,
            autoScroll: true,
            border: false,
            height: 330,
            loader: new Ext.tree.TreeLoader({
                dataUrl: MODx.config.assets_url + 'components/customtree/citytree.min.php'
            }),
            root: new Ext.tree.AsyncTreeNode({
                id: 'root',
                expanded: true
            }),
            listeners: {
                click: this.onNodeClick,
                load: this.markSelectedNodes,
                scope: this
            }
        });

        /* ---- PANEL INSIDE MENU ---- */

        this.menuPanel = new Ext.Panel({
            width: 380,
            height: 380,
            layout: 'anchor',
            border: false,
            items: [
                {
                    xtype: 'container',
                    style: 'padding:6px',
                    items: this.searchField
                },
                {
                    xtype: 'container',
                    anchor: '100% 100%',
                    layout: 'fit',
                    items: this.tree
                }
            ]
        });

        /* ---- MENU ---- */

        this.menu = new Ext.menu.Menu({
            cls: 'city-menu',
            shadow: true,
            plain: true,
            items: this.menuPanel,
            listeners: {
                hide: function () {
                    this.searchField.setValue('');
                    this.lastFoundNode = null;
                    this.clearSearchHighlight();
                },
                scope: this
            }
        });
    },

    /* ===================== TREE ===================== */

    onNodeClick: function (node) {
        var id = node.id.replace('node_', '');

        if (id === 'root_9' || id === 'root_13') return;

        var title = node.text.replace(/^.*──\s*/, '');

        if (this.currentValue.includes(id)) {
            this.currentValue = this.currentValue.filter(v => v !== id);
            node.getUI().removeClass('city-node-selected');
            this.sync();
            return;
        }

        if (this.currentValue.length >= this.maxSelected) {
            Ext.Msg.alert('Ограничение', 'Можно выбрать не более двух городов');
            return;
        }

        this.currentValue.push(id);
        this.nodeTitles[id] = title;

        node.getUI().addClass('city-node-selected');

        this.sync();
        this.menu.hide();
    },

    markSelectedNodes: function () {
        var me = this;

        this.tree.root.cascade(function (node) {
            if (!node.id || node.id === 'root') return;

            var id = node.id.replace('node_', '');
            if (me.currentValue.includes(id)) {
                node.getUI().addClass('city-node-selected');
                me.nodeTitles[id] = node.text.replace(/^.*──\s*/, '');
            }
        });
    },

    /* ===================== SEARCH ===================== */

    onSearch: function (field) {
        this.lastFoundNode = null;
        var query = field.getValue().toLowerCase();

        this.clearSearchHighlight();
        if (!query) return;

        var found = null;

        this.tree.root.cascade(function (node) {
            if (!node.text || found) return;

            var txt = node.text.replace(/^.*──\s*/, '').toLowerCase();
            if (txt.indexOf(query) !== -1) {
                found = node;
            }
        });

        if (found) {
            this.lastFoundNode = found;
            this.highlightNode(found);
        }
    },

    onSearchEnter: function (field, e) {
        if (e.getKey() !== e.ENTER) return;
        if (!this.lastFoundNode) return;

        this.onNodeClick(this.lastFoundNode);
    },

    highlightNode: function (node) {
        var p = node.parentNode;
        while (p) {
            if (p.expand) p.expand(false, false);
            p = p.parentNode;
        }

        node.getUI().addClass('city-search-hit');

        var el = node.getUI().getEl();
        if (el) {
            el.scrollIntoView(this.tree.body);
        }
    },

    clearSearchHighlight: function () {
        if (!this.tree) return;

        this.tree.root.cascade(function (node) {
            if (node.getUI) node.getUI().removeClass('city-search-hit');
        });
    },

    /* ===================== INITIAL VALUES ===================== */

    setValue: function (v) {
        v = (v || '').toString();

        if (this.hiddenField) {
            this.hiddenField.value = v;
        }

        this.currentValue = v
            .split('||')
            .map(s => s.trim())
            .filter(Boolean);

        this.loadInitialTitles();
        this.updatePlaceholder();
        return this;
    },

    loadInitialTitles: function () {
        var me = this;

        if (!this.currentValue.length) {
            this.renderChips();
            return;
        }

        Ext.Ajax.request({
            url: MODx.config.assets_url + 'components/customtree/citytitles.php',
            params: { ids: this.currentValue.join(',') },
            success: function (resp) {
                try {
                    me.nodeTitles = Ext.decode(resp.responseText) || {};
                } catch (e) {
                    me.nodeTitles = {};
                }
                me.renderChips();
            },
            failure: function () {
                me.renderChips();
            }
        });
    },

    renderChips: function () {
        if (!this.chipsWrap) return;

        this.chipsWrap.update('');

        this.currentValue.forEach(id => {
            var title = this.nodeTitles[id] || id;
            Ext.DomHelper.append(this.chipsWrap, {
                tag: 'span',
                cls: 'city-chip',
                html: Ext.util.Format.htmlEncode(title) +
                    ' <b data-id="' + id + '">×</b>'
            });
        });

        this.chipsWrap.select('.city-chip b').on('click', function (e, el) {
            var id = el.getAttribute('data-id');
            this.currentValue = this.currentValue.filter(v => v !== id);
            this.sync();
        }, this);
    }
};
