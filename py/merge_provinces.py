import os

def merge_js_files(js_folder, output_js_file):
    """
    将指定文件夹中的所有 .js 文件合并到一个单独的 JS 文件中
    
    Args:
        js_folder (str): JavaScript 文件所在的文件夹路径
        output_js_file (str): 输出的合并 JS 文件路径
    """
    # 确保输出目录存在
    output_dir = os.path.dirname(output_js_file)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # 读取并合并所有 JS 文件内容
    js_content = ""
    try:
        # 遍历文件夹中的所有文件，按文件名排序
        for filename in sorted(os.listdir(js_folder)):
            if filename.endswith('.js'):
                file_path = os.path.join(js_folder, filename)
                with open(file_path, 'r', encoding='utf-8') as f:
                    js_content += f'\n// {filename}\n' + f.read() + '\n'
    except Exception as e:
        print(f"读取 JS 文件时出错: {e}")
        return

    # 写入合并后的 JS 文件
    try:
        with open(output_js_file, 'w', encoding='utf-8') as f:
            f.write(js_content)
        print(f"成功合并 JS 文件到 {output_js_file}")
    except Exception as e:
        print(f"写入文件时出错: {e}")

merge_js_files('map/province', 'map/provinces.js')