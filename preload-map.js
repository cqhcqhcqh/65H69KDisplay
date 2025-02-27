// 存储地图数据的对象，初始为空
const mapData = {
    china: null,  // 全国地图数据
    provinces: {}, // 省份地图数据
    cities: {},    // 城市地图数据
    chineseProvince2MapProvince: {}, //
};

// 预加载所有地图数据到内存
async function loadMapData(provinces) {
    try {
        const chinese_province_2_map_province_response = await fetch('map/chinese_province_2_map_province.json')
        const chinese_province_2_map_province = await chinese_province_2_map_province_response.json()
        mapData.chineseProvince2MapProvince = chinese_province_2_map_province

        // 加载全国地图
        const chinaResponse = await fetch('map/china.json');
        if (!chinaResponse.ok) throw new Error('加载 china.json 失败');
        mapData.china = await chinaResponse.json();
        echarts.registerMap('china', mapData.china);

        // 加载省份地图（示例：广东和北京）
        // const provinces = ['广东', '北京'];
        for (const province of provinces) {
            const mapProvince = chinese_province_2_map_province[province]
            const provinceResponse = await fetch(`map/province/${mapProvince}.json`);
            if (!provinceResponse.ok) throw new Error(`加载 ${mapProvince}.json 失败`);
            mapData.provinces[mapProvince] = await provinceResponse.json();
            echarts.registerMap(mapProvince, mapData.provinces[mapProvince]);
        }

    } catch (error) {
        alert(`加载地图数据失败: ${error.message}`);
        // 备用方案：嵌入默认数据（可选）
        mapData.china = {/* 精简后的 china.json 内容 */};
        mapData.provinces = {
            '广东': {/* 精简后的 广东.json 内容 */},
            '北京': {/* 精简后的 北京.json 内容 */}
        };
        echarts.registerMap('china', mapData.china);
        echarts.registerMap('广东', mapData.provinces['广东']);
        echarts.registerMap('北京', mapData.provinces['北京']);
    }
}

// 暴露函数和变量到全局
window.loadMapData = loadMapData;
window.mapData = mapData;
