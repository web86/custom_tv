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
// 4) скрипт обработчик /assets/components/customtree/js/customtree.js + css
//-----------------------------------------------------------------------------------
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
