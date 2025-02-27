import pandas as pd
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
import sqlite3
import time
import numpy as np

# 1. 读取 Excel 文件
def read_excel_file(file_path):
    try:
        # 读取 Excel 文件，假设第一行是列名
        df = pd.read_excel(file_path)
        return df
    except Exception as e:
        print(f"读取 Excel 文件时出错: {e}")
        return None


proxies = {
    "http": "http://127.0.0.1:7890",  # 示例：本地代理地址和端口
    "https": "http://127.0.0.1:7890"
}

import requests
from tenacity import retry, stop_after_attempt, wait_fixed
BAIDU_AK = 'LdMuTqTHrYyyuakuie5qXT43YNY5kFg5'
@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def get_coordinates(location):
    try:
        # 构造百度地图 geocoding 请求
        url = f"http://api.map.baidu.com/geocoding/v3/?address={location}&output=json&ak={BAIDU_AK}"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        # 检查请求是否成功
        if data['status'] == 0:
            result = data['result']['location']
            return result['lat'], result['lng']
        else:
            print(f"无法解析位置: {location}, 状态码: {data['status']}, 消息: {data.get('message', '未知错误')}")
            return None, None
    except Exception as e:
        print(f"获取经纬度时出错: {e}")
        return None, None
    
# 2. 获取经纬度
# def get_coordinates(location):
#     try:
#         # 初始化 geocoding 服务
#         geolocator = Nominatim(user_agent="my_hotel_geo_project_2025", proxies=proxies)
#         # 添加速率限制，避免请求过快被拒绝
#         geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1)
        
#         # 获取位置信息
#         location_data = geocode(location)
#         if location_data:
#             return location_data.latitude, location_data.longitude
#         return None, None
#     except Exception as e:
#         print(f"获取经纬度时出错: {e}")
#         return None, None

# 3. 创建数据库并插入数据
def create_database(df, sheet_name, db_name="data/hotels.db"):
    # 连接到 SQLite 数据库
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    
    # 创建表格
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hotels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand_name TEXT,
            subbrand_name TEXT DEFAULT NULL,
            province TEXT,
            city TEXT,
            hotel_name TEXT,
            tv_model TEXT,
            tv_sales INTEGER,
            location TEXT,
            latitude REAL,
            longitude REAL,
            UNIQUE(province, city, brand_name, hotel_name, location)
        )
    ''')
    
    # 遍历数据并插入
    No_NaN_province = None
    No_NaN_city = None
    for index, row in df.iloc[1::].iterrows():
        # 获取经纬度
        latitude, longitude = get_coordinates(row.iloc[5])
        province = row.iloc[0]
        if province and pd.isna(province) == False:
            No_NaN_province = province
        city = row.iloc[1]
        if city and pd.isna(city) == False:
            No_NaN_city = city
        # 插入数据
        cursor.execute('''
            INSERT OR IGNORE INTO hotels (brand_name, province, city, hotel_name, tv_model, tv_sales, location, latitude, longitude)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            sheet_name,  # 品牌名（第一列）
            No_NaN_province,
            No_NaN_city,
            row.iloc[2],
            row.iloc[3],
            row.iloc[4],
            row.iloc[5],
            latitude,
            longitude
        ))
        
        # 打印进度
        print(f"已处理第 {index} 条记录")
        
        # 添加短暂延迟，避免请求过快
        time.sleep(1)
    
    # 提交更改并关闭连接
    conn.commit()
    conn.close()
    print("数据库创建完成！")

# 主函数
def main():
    # Excel 文件路径
    file_path = "data/hotels.xlsx"
    
    # 读取 Excel
    df_hotels = pd.read_excel(file_path, sheet_name=None)
    for sheet_name, df in df_hotels.items():
        if sheet_name =='朵兰达':
            print("Excel 列名:", df.columns.tolist())
            
            # 创建数据库
            create_database(df, sheet_name)
            break
    
    # 打印列名以确认数据结构

if __name__ == "__main__":
    main()