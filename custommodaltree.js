// Этапы
//-----------------------------------------------------------------------------------
// 1) новый класс /core/components/customtree/tv/input/customtree.class.php
//-----------------------------------------------------------------------------------
<?php
if(!class_exists('CustomTreeInputRender')) {
    class CustomTreeInputRender extends modTemplateVarInputRender {
        public function getTemplate() {
            return $this->modx->getOption('core_path').'components/customtree/tv/input/tpl/customtree.tpl';
        }
        public function process($value,array $params = array()) {
        }
    }
}
return 'CustomTreeInputRender';

//-----------------------------------------------------------------------------------
// 2) новый плагин на соответствующие события  CustomTreePlugin
//-----------------------------------------------------------------------------------

<?php
$corePath = $modx->getOption('core_path',null,MODX_CORE_PATH).'components/customtree/';
$assetsUrl = $modx->getOption('assets_url', null, MODX_ASSETS_URL) . 'components/customtree/';

switch ($modx->event->name) {
    case 'OnTVInputRenderList':
        $modx->event->output($corePath.'tv/input/');
        break;
    case 'OnTVOutputRenderList':
        $modx->event->output($corePath.'tv/output/');
        break;
    case 'OnTVInputPropertiesList':
        $modx->event->output($corePath.'tv/inputoptions/');
        break;
    case 'OnTVOutputRenderPropertiesList':
        $modx->event->output($corePath.'tv/properties/');
        break;
    case 'OnManagerPageBeforeRender':

    $modx->controller->addJavascript($assetsUrl.'js/customtree.js');
    $modx->controller->addCss($assetsUrl.'css/customtree.css');
        break;
}

//-----------------------------------------------------------------------------------
// 3) новый TV шаблон core/components/customtree/tv/input/tpl/customtree.tpl
//-----------------------------------------------------------------------------------

<div class="cityhierarchy__wrapper">

    <input
        type="hidden"
        id="tv{$tv->id}"
        name="tv{$tv->id}"
        value="{$tv->get('value')|escape}"
    />

    <div
        id="cityhierarchy-ui-{$tv->id}"
        class="cityhierarchy-ui"
    ></div>

</div>

<script type="text/javascript">
// <![CDATA[
Ext.onReady(function () {

    var inputId = 'tv{$tv->id}';
    var uiId    = 'cityhierarchy-ui-{$tv->id}';

    var inputEl = Ext.get(inputId);
    var uiEl    = Ext.get(uiId);

    if (!inputEl || !uiEl) return;

    var field = new CustomFields.field.CityHierarchyTree({
        renderTo: uiEl,
        hiddenField: inputEl.dom,
        value: inputEl.dom.value || '',
        maxSelected: 2
    });

    field.onChange = function () {
        MODx.fireResourceFormChange();
    };

});
// ]]>
</script>

//-----------------------------------------------------------------------------------
// 4) скрипт обработчик /assets/components/customtree/js/customtree.js
//-----------------------------------------------------------------------------------

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

//-----------------------------------------------------------------------------------
// 5) Пространства имён - добавить в настройках 
//-----------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------
// 6) контроллер /assets/components/customtree/citytree.min.php
//-----------------------------------------------------------------------------------
<?php
require_once dirname(dirname(dirname(dirname(__FILE__)))).'/config.core.php';
require_once MODX_CORE_PATH.'config/'.MODX_CONFIG_KEY.'.inc.php';
require_once MODX_CONNECTORS_PATH.'index.php';

header('Content-Type: application/json; charset=utf-8');

if (!$modx->user || !$modx->user->isAuthenticated('mgr')) {
    http_response_code(403);
    exit;
}

/**
 * Рекурсивно собираем дерево ресурсов
 */
 function buildTree(modX $modx, int $parent, string $prefix = ''): array {
    $nodes = [];

    $q = $modx->newQuery('modResource', [
        'parent'    => $parent,
        'deleted'   => 0,
        'published' => 1
    ]);
    $q->sortby('pagetitle', 'ASC');

    $children = $modx->getCollection('modResource', $q);
    $total = count($children);
    $i = 0;

    foreach ($children as $res) {
        $i++;
        $isLast = ($i === $total);

        $line = $prefix . ($isLast ? '└── ' : '│── ');

        $nodes[] = [
            'id'       => 'node_' . $res->get('id'),
            'text'     => $line . $res->get('pagetitle'),
            'expanded' => true,
            'cls'      => 'tree-group', 
            'children' => buildTree(
                $modx,
                (int)$res->get('id'),
                $prefix . ($isLast ? '    ' : '│   ')
            )
        ];
    }

    return $nodes;
}


/**
 * Корни
 */
$result = [];

// Москва (90)
if ($res = $modx->getObject('modResource', 90)) {
    $result[] = [
        'id'       => '90',
        'text'     => $res->get('pagetitle'),
        'expanded' => true,
        'children' => buildTree($modx, 90)
    ];
}

// Московская область (9)
if ($res = $modx->getObject('modResource', 9)) {
    $result[] = [
        'id'       => 'root_9',
        'text'     => '[' . $res->get('pagetitle') . ']',
        'expanded' => true,
        'children' => buildTree($modx, 9)
    ];
}

// Регионы РФ (13)
if ($res = $modx->getObject('modResource', 13)) {
    $result[] = [
        'id'       => 'root_13',
        'text'     => '[' . $res->get('pagetitle') . ']',
        'expanded' => true,
        'children' => buildTree($modx, 13)
    ];
}

echo json_encode($result);
return;

//-----------------------------------------------------------------------------------
// 7) контроллер /assets/components/customtree/citytitles.php
//-----------------------------------------------------------------------------------
<?php
require_once dirname(dirname(dirname(dirname(__FILE__)))).'/config.core.php';
require_once MODX_CORE_PATH.'config/'.MODX_CONFIG_KEY.'.inc.php';
require_once MODX_CONNECTORS_PATH.'index.php';

header('Content-Type: application/json; charset=utf-8');

if (!$modx->user || !$modx->user->isAuthenticated('mgr')) {
    http_response_code(403);
    exit;
}

// $idsRaw = $_GET['ids'] ?? '';
$idsRaw = $_REQUEST['ids'] ?? '';
$ids = array_filter(array_map('intval', explode(',', $idsRaw)));

$result = [];

if ($ids) {
    $q = $modx->newQuery('modResource');
    $q->where([
        'id:IN' => $ids,
        'deleted' => 0
    ]);

    /** @var modResource $res */
    foreach ($modx->getCollection('modResource', $q) as $res) {
        $result[(string)$res->get('id')] = $res->get('pagetitle');
    }
}

echo json_encode($result);
return;
