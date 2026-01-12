Ext.ns('CustomFields.field');

CustomFields.field.CityHierarchyTree = function (config) {
    this.hiddenField = config.hiddenField;
    this.currentValue = (config.value || '')
        .split(',')
        .filter(Boolean);

    this.renderTo = config.renderTo;
    
     this.nodeTitles  = {};                
    this.maxSelected = config.maxSelected || 2;

    this.render();
};

CustomFields.field.CityHierarchyTree.prototype = {

    render: function () {

        this.fakeInput = Ext.DomHelper.append(this.renderTo, {
            tag: 'div',
            cls: 'city-select-input',
            html: 'Выбрать город'
        }, true);

        this.chipsWrap = Ext.DomHelper.append(this.fakeInput, {
            tag: 'div',
            cls: 'city-chips'
        }, true);

        this.fakeInput.on('click', this.openModal, this);

        this.renderChips();
    },

    sync: function () {
        this.hiddenField.value = this.currentValue.join(',');
        this.renderChips();
        if (this.onChange) this.onChange();
    },

   
        /* ===================== MODAL ===================== */

        openModal: function () {
            if (this.win) {
                this.win.show();
                return;
            }

            // DOM-контейнер под дерево
            this.modalWrap = Ext.DomHelper.createDom({
                tag: 'div',
                cls: 'city-tree-wrap'
            });

            // Panel-обёртка (ВАЖНО)
            this.modalPanel = new Ext.Panel({
                border: false,
                autoScroll: true,
                contentEl: this.modalWrap
            });
            
            this.searchField = new Ext.form.TextField({
                emptyText: 'Поиск города…',
                enableKeyEvents: true,
                cls: 'city-search-field',
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


            // Tree
            this.tree = new Ext.tree.TreePanel({
                renderTo: this.modalWrap,
                rootVisible: false,
                useArrows: false,
                border: false,
                autoScroll: false,
                loader: new Ext.tree.TreeLoader({
                    dataUrl: MODx.config.assets_url + 'components/customtree/citytree.min.php'
                }),
                root: new Ext.tree.AsyncTreeNode({
                    id: 'root',
                    expanded: true
                }),
                listeners: {
                    // click: this.onNodeClick,
                    // scope: this,
                    // load: this.markSelectedNodes,
                    // scope: this
                    click: this.onNodeClick,
                    load: function (node) {
                        console.log('[Tree LOAD]', node.id, 'children:', node.childNodes.length);
                        this.markSelectedNodes();
                    },
                    scope: this
                }
            });

            this.win = new Ext.Window({
                title: 'Выберите города (макс. 2)',
                modal: true,
                width: 480,
                height: 520,
                layout: 'anchor',
                items: [
                    {
                        xtype: 'container',
                        anchor: '100%',
                        style: 'padding:8px',
                        items: this.searchField
                    },
                    {
                        xtype: 'container',
                        anchor: '100% 100%',
                        layout: 'fit',
                        items: this.modalPanel
                    }
                ],

                //items: this.modalPanel,
                closeAction: 'hide',
                buttons: [
                    {
                        text: 'Отмена',
                        cls: 'primary-button',
                        handler: function () {
                            this.win.hide();
                        },
                        scope: this
                    },
                    // {
                    //     text: 'Готово',
                    //     cls: 'primary-button',
                    //     handler: function () {
                    //         this.sync();
                    //         this.win.hide();
                    //     },
                    //     scope: this
                    // }
                ],
                listeners: {
                    hide: function () {
                        // очистка поиска
                        if (this.searchField) {
                            this.searchField.setValue('');
                        }
                
                        // сброс найденного узла
                        this.lastFoundNode = null;
                
                        // убрать подсветку
                        this.clearSearchHighlight();
                    },
                    scope: this
                }
            });

            this.win.show();
            this.searchField.focus(false, 200);
        },

        /* ===================== TREE ===================== */

        onNodeClick: function (node) {
            // запрещаем выбор разделов (есть children)
            // if (node.attributes.children && node.attributes.children.length) {
            //     return;
            // }

            var id = node.id.replace('node_', '');
            // запрещаем выбор разделов
            if (id === 'root_9' || id === 'root_13') {
                return;
            }
            var title = node.text.replace(/^.*──\s*/, '');

            var idx = this.currentValue.indexOf(id);

            // снять выбор
            if (idx !== -1) {
                this.currentValue.splice(idx, 1);
                node.getUI().removeClass('city-node-selected');
                return;
            }

            // лимит
            if (this.currentValue.length >= this.maxSelected) {
                Ext.Msg.alert('Ограничение', 'Можно выбрать не более двух городов');
                return;
            }

            this.currentValue.push(id);
            this.nodeTitles[id] = title;
            node.getUI().addClass('city-node-selected');
            this.sync();
            this.win.hide();
        },
        
        onSearchEnter: function (field, e) {
            if (e.getKey() !== e.ENTER) return;
        
            var node = this.lastFoundNode;
            if (!node) return;
        
            var id = node.id.replace('node_', '');
        
            // запрет выбора разделов
            if (id === 'root_9' || id === 'root_13') return;
        
            // уже выбран — просто закрываем
            if (this.currentValue.indexOf(id) !== -1) {
                this.win.hide();
                return;
            }
        
            // лимит
            if (this.currentValue.length >= this.maxSelected) {
                Ext.Msg.alert('Ограничение', 'Можно выбрать не более двух городов');
                return;
            }
        
            var title = node.text.replace(/^.*──\s*/, '');
        
            this.currentValue.push(id);
            this.nodeTitles[id] = title;
        
            node.getUI().addClass('city-node-selected');
        
            this.sync();
            this.win.hide();
        },


        markSelectedNodes: function () {
            var me = this;

            this.tree.root.cascade(function (node) {
                if (!node.id || node.id === 'root') return;

                var id = node.id.replace('node_', '');
                if (me.currentValue.indexOf(id) !== -1) {
                    node.getUI().addClass('city-node-selected');
                    me.nodeTitles[id] = node.text.replace(/^.*──\s*/, '');
                }
            });
            //this.renderChips();
        },
        
        onSearch: function (field) {
            this.lastFoundNode = null;
            var query = field.getValue().toLowerCase();
            
            // очистка подсветки
            this.clearSearchHighlight();
        
            if (!query) return;
        
            var foundNode = null;
            var totalNodes = 0;
            
            this.tree.root.cascade(function (node) {
                totalNodes++;
            
                if (!node.text) {
                    return;
                }
            
                var cleanText = node.text.replace(/^.*──\s*/, '').toLowerCase();
            
                if (!foundNode && cleanText.indexOf(query) !== -1) {
                    foundNode = node;
                    return false;
                }
            });
            
            if (foundNode) {
                this.lastFoundNode = foundNode;
                this.highlightNode(foundNode);
            }

        },
        
        highlightNode: function (node) {
            // 1. гарантированно раскрываем всех родителей
            var p = node.parentNode;
            while (p) {
                if (p.expand) {
                    p.expand(false, false);
                }
                p = p.parentNode;
            }
        
            // 2. подсветка
            node.getUI().addClass('city-search-hit');
        
            // 3. корректный скролл (ExtJS way)
            var el = node.getUI().getEl();
            var container = this.modalPanel.body;
        
            if (el && container) {
                var nodeY = Ext.fly(el).getY();
                var contY = container.getY();
        
                container.dom.scrollTop += (nodeY - contY - 30);
            }
        },

        
        clearSearchHighlight: function () {
            if (!this.tree) return;
        
            this.tree.root.cascade(function (node) {
                if (node.getUI && node.getUI().removeClass) {
                    node.getUI().removeClass('city-search-hit');
                }
            });
        },


        /* ===================== CHIPS ===================== */
        
        setValue: function (v) {
            v = (v || '').toString();
        
            // записываем в hidden input
            if (this.hiddenField) {
                this.hiddenField.value = v;
            }
        
            // парсим текущее значение
            this.currentValue = v
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
        
            // console.log('[CityHierarchyTree] setValue from Extrafields', this.currentValue);
        
            // грузим названия и рисуем чипсы
            this.loadInitialTitles();
        
            return this;
        },

        
        loadInitialTitles: function () {
            var me = this;
        
            //console.log('[CityHierarchyTree] loadInitialTitles', this.currentValue);
        
            if (!this.chipsWrap) {
                console.warn('[CityHierarchyTree] chipsWrap not ready');
                return;
            }
        
            if (!this.currentValue.length) {
                this.renderChips();
                return;
            }
        
            Ext.Ajax.request({
                url: MODx.config.assets_url + 'components/customtree/citytitles.php',
                params: {
                    ids: this.currentValue.join(',')
                },
                success: function (resp) {
                    try {
                        var data = Ext.decode(resp.responseText);
                        //me.nodeTitles = data || {};
                        me.nodeTitles = Ext.isObject(data) ? data : {};
                    } catch (e) {
                        console.error('[CityHierarchyTree] JSON error', e);
                        me.nodeTitles = {};
                    }
        
                    //console.log('[CityHierarchyTree] titles keys', Object.keys(me.nodeTitles));

                    me.renderChips();
                },
                failure: function () {
                    console.error('[CityHierarchyTree] titles ajax failed');
                    me.renderChips(); // fallback
                }
            });
        },

        renderChips: function () {
            if (!this.chipsWrap) return;
        
            this.chipsWrap.update('');
        
            if (!this.currentValue.length) return;
        
            this.currentValue.forEach(function (id) {
                var title = this.nodeTitles[id] || id;
        
                Ext.DomHelper.append(this.chipsWrap, {
                    tag: 'span',
                    cls: 'city-chip',
                    html: Ext.util.Format.htmlEncode(title) +
                        ' <b data-id="' + id + '">×</b>'
                });
            }, this);
        
            this.chipsWrap.select('.city-chip b').on('click', function (e, el) {
                var id = el.getAttribute('data-id');
                this.currentValue = this.currentValue.filter(v => v !== id);
                this.sync();
            }, this);
        },
};
