// 初始化地图和饼状图实例
const mapChart = echarts.init(document.getElementById('map'));  // 地图容器
const chart = echarts.init(document.getElementById('chart'));   // 饼状图容器
let currentLevel = 'china';                                    // 当前地图层级：全国、省、市
let currentRegion = null;                                      // 当前选中的区域名称

// 存储地图数据的对象
const mapData = {
    china: null,           // 全国地图数据
    provinces: {},         // 省份地图数据
    cities: {}             // 城市地图数据
};

// 省份中心点坐标（示例，可根据实际 GeoJSON 调整）
const provinceCenters = {
    '广东': [113.2665, 23.1322],  // 广州附近
    '北京': [116.4074, 39.9042],  // 北京中心
    '上海': [121.4737, 31.2304]   // 上海中心
};

// 加载全国地图数据
fetch('map/china.json')
    .then(res => res.json())
    .then(geoJson => {
        mapData.china = geoJson;                           // 存储全国地图
        echarts.registerMap('china', geoJson);             // 注册全国地图
        loadData();                                        // 加载项目数据
    })
    .catch(err => alert('加载 map/china.json 失败: ' + err)); // 错误提示

// 加载项目数据
function loadData() {
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            window.projectData = data;                     // 全局存储项目数据
            initFilters(data);                             // 初始化筛选器
            updateAll(data);                               // 更新所有视图
        })
        .catch(err => alert('加载 data.json 失败: ' + err));
}

// 初始化筛选器（品牌和尺寸）
function initFilters(data) {
    const brands = [...new Set(data.map(item => item.brand))]; // 获取唯一品牌列表
    document.getElementById('brandFilter').innerHTML += brands.map(b => `<option>${b}</option>`).join('');

    const sizes = [...new Set(data.map(item => item.size))];   // 获取唯一尺寸列表
    document.getElementById('sizeFilter').innerHTML += sizes.map(s => `<option>${s}</option>`).join('');
}

// 更新地图视图
function updateMap(filteredData) {
    const option = {
        backgroundColor: '#1e3c72',                      // 地图背景色
        geo: {
            map: currentLevel === 'china' ? 'china' : currentRegion, // 当前地图层级
            roam: true,                                  // 允许缩放和平移
            itemStyle: {
                areaColor: '#2a5298',                    // 区域颜色
                borderColor: '#ffffff'                   // 边框颜色
            }
        },
        series: [{
            type: 'scatter',                            // 散点图表示项目
            coordinateSystem: 'geo',                    // 使用地理坐标系
            data: filteredData.map(item => ({
                name: item.hotelName,                   // 酒店名称作为标注
                value: item.coordinates.split(',').map(Number).concat(item.supply) // [经度, 纬度, 供货数]
            })),
            symbolSize: 15,                             // 星星大小
            itemStyle: { color: '#ffd700' }             // 金色星星
        }]
    };

    if (currentLevel === 'province' && provinceCenters[currentRegion]) {
        option.geo.center = provinceCenters[currentRegion];
        option.geo.zoom = 1;
    }

    mapChart.setOption(option);
}

// 更新统计数据
function updateStats(filteredData) {
    document.getElementById('hotelCount').textContent = filteredData.length; // 总酒店数
    document.getElementById('supplyCount').textContent = filteredData.reduce((sum, item) => sum + item.supply, 0); // 总供货数
}

// 更新饼状图（尺寸分布）
function updateChart(filteredData) {
    const sizeData = filteredData.reduce((acc, item) => {
        acc[item.size] = (acc[item.size] || 0) + item.supply; // 按尺寸统计供货数
        return acc;
    }, {});
    chart.setOption({
        title: { text: '尺寸占比', left: 'center', textStyle: { fontSize: 24 } },
        series: [{
            type: 'pie',                                // 饼状图
            radius: '50%',                              // 饼图半径
            data: Object.entries(sizeData).map(([name, value]) => ({ name, value })),
            label: { fontSize: 18 }                     // 标签字体大小
        }]
    });
}

// 更新索引信息（品牌布局和尺寸数量）
function updateIndex(filteredData) {
    const selectedBrand = document.getElementById('brandFilter').value;
    const selectedSize = document.getElementById('sizeFilter').value;

    if (selectedBrand) {
        const brandData = filteredData.filter(item => item.brand === selectedBrand);
        const provinces = [...new Set(brandData.map(item => item.province))].join(', ');
        document.getElementById('brandIndex').textContent = `${brandData.length} 个项目，分布: ${provinces || '无'}`;
    } else {
        document.getElementById('brandIndex').textContent = '未选择品牌';
    }

    if (selectedSize) {
        const sizeData = filteredData.filter(item => item.size === selectedSize);
        document.getElementById('sizeIndex').textContent = `${sizeData.reduce((sum, item) => sum + item.supply, 0)} 台`;
    } else {
        document.getElementById('sizeIndex').textContent = '未选择尺寸';
    }
}

// 更新所有视图
function updateAll(data) {
    const selectedBrand = document.getElementById('brandFilter').value;
    const selectedSize = document.getElementById('sizeFilter').value;
    let filtered = data;

    // 按品牌和尺寸筛选
    if (selectedBrand || selectedSize) {
        filtered = data.filter(item =>
            (!selectedBrand || item.brand === selectedBrand) &&
            (!selectedSize || item.size === selectedSize)
        );
    }

    // 按地图层级过滤
    if (currentLevel === 'province') {
        filtered = filtered.filter(item => item.province === currentRegion);
    } else if (currentLevel === 'city') {
        filtered = filtered.filter(item => item.city === currentRegion);
    }
    if (filtered.length < 1) {
        alert(`暂无销售记录`);
        return
    }

    updateMap(filtered);
    updateStats(filtered);
    updateChart(filtered);
    updateIndex(filtered);
}

// 点击地图切换层级
mapChart.on('click', params => {
    if (params.componentType === 'geo') {
        const regionName = params.name;
        if (currentLevel === 'china') {
            currentLevel = 'province';                  // 切换到省份层级
            currentRegion = regionName;
            fetchProvinceMap(regionName);
        } else if (currentLevel === 'province') {
            currentLevel = 'city';                      // 切换到城市层级
            currentRegion = regionName;
            fetchCityMap(regionName);
        }
    }
});

// 加载省份地图
function fetchProvinceMap(province) {
    fetch(`map/province/${province}.json`)            // 从 province 文件夹加载
        .then(res => res.json())
        .then(geoJson => {
            mapData.provinces[province] = geoJson;    // 存储省份地图
            echarts.registerMap(province, geoJson);   // 注册省份地图
            updateAll(window.projectData);            // 更新视图
        })
        .catch(() => {
            alert(`未找到 map/province/${province}.json，恢复全国视图`);
            currentLevel = 'china';
            currentRegion = null;
            updateAll(window.projectData);
        });
}

// 加载城市地图（占位，未实现）
function fetchCityMap(city) {
    // 假设城市地图也在 map/province/ 下，可根据需要调整
    fetch(`map/province/${city}.json`)
        .then(res => res.json())
        .then(geoJson => {
            mapData.cities[city] = geoJson;
            echarts.registerMap(city, geoJson);
            updateAll(window.projectData);
        })
        .catch(() => {
            alert(`未找到 map/province/${city}.json，保持省视图`);
            currentLevel = 'province';
            updateAll(window.projectData);
        });
}

// 返回全国视图
document.getElementById('resetMap').addEventListener('click', () => {
    currentLevel = 'china';
    currentRegion = null;
    updateAll(window.projectData);
});

// 绑定筛选事件
document.getElementById('brandFilter').addEventListener('change', () => updateAll(window.projectData));
document.getElementById('sizeFilter').addEventListener('change', () => updateAll(window.projectData));