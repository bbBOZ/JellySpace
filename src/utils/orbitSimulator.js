export const ORBIT_LOCATIONS = [
    // 假想轨迹：模拟环绕地球一圈的路径节点 (每个节点约15分钟)

    // 轨迹片段1：从大洋洲到太平洋
    { name: '新西兰上空', type: 'ocean' },
    { name: '南太平洋区域', type: 'ocean' },
    { name: '夏威夷群岛东南', type: 'ocean' },
    { name: '东太平洋海岭', type: 'ocean' },

    // 轨迹片段2：北美与南美
    { name: '墨西哥', type: 'country' },
    { name: '美国·德克萨斯', type: 'region' },
    { name: '美国·佛罗里达', type: 'region' },
    { name: '北大西洋西部', type: 'ocean' },

    // 轨迹片段3：欧洲与非洲
    { name: '葡萄牙', type: 'country' },
    { name: '西班牙', type: 'country' },
    { name: '地中海区域', type: 'ocean' },
    { name: '埃及', type: 'country' },
    { name: '沙特阿拉伯', type: 'country' },

    // 轨迹片段4：亚洲与中国 (重点)
    { name: '印度洋北部', type: 'ocean' },
    { name: '印度', type: 'country' },
    { name: '孟加拉湾', type: 'ocean' },
    { name: '缅甸', type: 'country' },
    { name: '中国·云南', type: 'cn_province' },
    { name: '中国·四川', type: 'cn_province' },
    { name: '中国·陕西', type: 'cn_province' },
    { name: '中国·山西', type: 'cn_province' },
    { name: '中国·河北', type: 'cn_province' }, // 靠近北京
    { name: '渤海湾', type: 'ocean' },

    // 轨迹片段5：东亚延伸
    { name: '朝鲜半岛', type: 'region' },
    { name: '日本海', type: 'ocean' },
    { name: '日本·本州岛', type: 'region' },
    { name: '西北太平洋', type: 'ocean' },

    // 循环补充，凑够24小时周期或更长循环
    { name: '马里亚纳海沟上方', type: 'ocean' },
    { name: '西太平洋赤道区', type: 'ocean' },
    { name: '巴布亚新几内亚', type: 'country' },
    { name: '澳大利亚·昆士兰', type: 'region' },
    { name: '珊瑚海', type: 'ocean' }
];

export function calculateCurrentLocation() {
    // 算法核心：基于当前时间的时间戳，计算落在哪个区间
    // 设定每个区间的停留时间为 15 分钟 (15 * 60 * 1000 ms)
    const INTERVAL_MS = 15 * 60 * 1000;

    // 获取当当前时间戳
    const now = Date.now();

    // 计算从 1970年1月1日 到现在经历的 "15分钟块" 的数量
    const totalSlots = Math.floor(now / INTERVAL_MS);

    // 取模，得到在列表中的索引
    // 这样能保证：
    // 1. 全球时间同步，不管谁什么时候打开，算出来是一样的
    // 2. 随时间自动推移
    // 3. 循环播放
    const dataIndex = totalSlots % ORBIT_LOCATIONS.length;

    return ORBIT_LOCATIONS[dataIndex];
}
