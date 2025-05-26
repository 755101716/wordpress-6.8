// 直接写死 access_token，避免CORS问题
const ACCESS_TOKEN = '24.704016ea204af4466783dd96eac80fef.2592000.1748351783.282335-118683699';

// 计算两个字符串的相似度（Levenshtein距离）
function similarity(s1, s2) {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return 1 - matrix[len1][len2] / Math.max(len1, len2);
}

// 查找最相似的海洋生物名称
function findMostSimilar(name, threshold = 0.6) {
  let maxSimilarity = 0;
  let mostSimilar = null;
  
  for (const key in marineInfo) {
    const sim = similarity(name, key);
    if (sim > maxSimilarity && sim >= threshold) {
      maxSimilarity = sim;
      mostSimilar = key;
    }
  }
  
  return mostSimilar;
}

// 存储海洋生物信息
let marineInfo = {};

// 存储海洋生物数据
let marineSpeciesData = [];

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing...');
  
  // 加载海洋生物信息
  fetch('data/marine_info.json')
    .then(res => res.json())
    .then(data => {
      marineInfo = data;
      console.log('Marine info loaded:', marineInfo);
    })
    .catch(error => {
      console.error('加载海洋生物信息失败:', error);
    });

  // 加载海洋生物分类
  fetch('data/marine_species.json')
    .then(res => res.json())
    .then(data => {
      marineSpeciesData = data;
      const list = document.getElementById('species-list');
      if (!list) {
        console.error('Species list element not found!');
        return;
      }
      
      data.forEach(cat => {
        const catDiv = document.createElement('div');
        catDiv.className = 'species-category';
        catDiv.textContent = cat.category;
        list.appendChild(catDiv);
        
        cat.items.forEach(item => {
          const card = document.createElement('div');
          card.className = 'species-card';
          card.innerHTML = `
            <img src="${item.image}" alt="${item.name}" loading="lazy">
            <h4>${item.name}</h4>
            <p>${item.desc}</p>
          `;
          list.appendChild(card);
        });
      });
      console.log('Species list populated');
    })
    .catch(error => {
      console.error('加载海洋生物分类失败:', error);
    });

  // 加载违法案例
  fetch('data/illegal_cases.json')
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById('cases-list');
      if (!list) {
        console.error('Cases list element not found!');
        return;
      }
      
      data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'case-card';
        card.innerHTML = `
          <div class="case-image-container" style="position:relative;width:100%;height:200px;overflow:hidden;border-radius:8px;margin-bottom:1rem;">
            <img src="${item.image}" alt="${item.title}" style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s ease;">
          </div>
          <h4 style="margin:0 0 0.5rem 0;color:#1e3c72;">${item.title}</h4>
          <p style="margin:0 0 0.5rem 0;color:#666;line-height:1.5;">${item.desc || item.description || ''}</p>
          ${item.warning ? `<strong style="color:#d84315;display:block;margin-bottom:0.5rem;">${item.warning}</strong>` : ''}
          ${item.date ? `<p style="margin:0 0 0.25rem 0;color:#666;font-size:0.9rem;">📅 ${item.date}</p>` : ''}
          ${item.location ? `<p style="margin:0 0 0.25rem 0;color:#666;font-size:0.9rem;">📍 ${item.location}</p>` : ''}
          ${item.penalty ? `<p style="margin:0;color:#666;font-size:0.9rem;">⚖️ ${item.penalty}</p>` : ''}
        `;
        list.appendChild(card);

        // 添加图片悬停效果
        const img = card.querySelector('img');
        img.addEventListener('mouseover', () => {
          img.style.transform = 'scale(1.05)';
        });
        img.addEventListener('mouseout', () => {
          img.style.transform = 'scale(1)';
        });
      });
      console.log('Cases list populated');
    })
    .catch(error => {
      console.error('加载违法案例失败:', error);
    });

  // 初始化地图
  console.log('Initializing map...');
  
  // 获取地图容器
  const mapContainer = document.getElementById('marine-map');
  if (!mapContainer) {
    console.error('Map container not found!');
    return;
  }
  
  try {
    // 初始化地图
    const map = L.map('marine-map', {
      center: [30.0, 122.2],
      zoom: 8,
      zoomControl: true,
      attributionControl: false
    });

    console.log('Map initialized successfully');

    // 使用卫星图作为底图
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri',
      maxZoom: 19,
      minZoom: 3
    }).addTo(map);

    console.log('Tile layer added');

    // 调整海洋区域标记的样式
    const oceanBounds = L.rectangle(
      [[-60, -180], [60, 180]],
      {
        color: '#4fd1c5',
        fillColor: '#4fd1c5',
        fillOpacity: 0.1,
        weight: 1,
        dashArray: '5, 5'
      }
    ).addTo(map);

    // 自定义海洋生物标记图标
    const marineIcon = L.divIcon({
      className: 'marine-marker',
      html: '🐠',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    // 调整舟山区域标记的样式
    const zhoushanArea = L.rectangle(
      [[29.5, 121.5], [30.5, 123]],
      {
        color: '#1e3c72',
        fillColor: '#4fd1c5',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5'
      }
    ).addTo(map);

    // 添加舟山标签
    const zhoushanLabel = L.marker([30.0, 122.2], {
      icon: L.divIcon({
        className: 'zhoushan-label',
        html: '舟山渔场',
        iconSize: [0, 0]
      })
    }).addTo(map);

    // 添加地图控件
    const zoomControl = L.control.zoom({
      position: 'topright'
    }).addTo(map);

    // 添加地图标题
    const title = L.control({position: 'topleft'});
    title.onAdd = function() {
      const div = L.DomUtil.create('div', 'map-title');
      div.innerHTML = '<h3>海洋生物分布图</h3>';
      return div;
    };
    title.addTo(map);

    // 在数据加载完成后添加标记点
    fetch('data/zhoushan_species.json')
      .then(res => res.json())
      .then(data => {
        zhoushanSpeciesInfo = data;
        addSpeciesMarkers(map);
        console.log('Species markers added');
      })
      .catch(error => {
        console.error('加载舟山海洋生物信息失败:', error);
      });

    // 位置选择
    const locationInput = document.getElementById('report-location');
    let locationMarker = null;

    // 点击地图选择位置
    map.on('click', function(e) {
      if (locationMarker) {
        map.removeLayer(locationMarker);
      }
      
      locationMarker = L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'location-marker',
          html: '📍',
          iconSize: [30, 30],
          iconAnchor: [15, 30]
        })
      }).addTo(map);
      
      locationInput.value = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
    });

    // 强制地图重绘
    map.invalidateSize();

    // 图片识别功能
    const uploadInput = document.getElementById('upload-input');
    const recognizeBtn = document.getElementById('recognize-btn');
    const recognitionResult = document.getElementById('recognition-result');
    const shareButtons = document.querySelector('.share-buttons');

    if (uploadInput && recognitionResult) {
      // 选择图片后立即显示预览
      uploadInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function(e) {
            recognitionResult.innerHTML = `
              <div class="image-preview" style="margin: 1rem 0; text-align: center;">
                <img src="${e.target.result}" alt="预览图片" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
              </div>
            `;
          };
          reader.readAsDataURL(file);
        }
      });
    } else {
      console.error('Required elements not found:', { uploadInput, recognitionResult });
    }

    recognizeBtn.addEventListener('click', async function() {
      const file = uploadInput.files[0];
      if (!file) {
        alert('请先选择一张图片');
        return;
      }

      try {
        // 显示加载状态
        recognitionResult.innerHTML = '<p>正在识别中...</p>';
        
        // 将图片转换为base64
        const reader = new FileReader();
        reader.onload = async function(e) {
          const base64Image = e.target.result.split(',')[1];
          
          // 调用百度AI接口进行识别
          const response = await fetch('https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general?access_token=' + ACCESS_TOKEN, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'image=' + encodeURIComponent(base64Image)
          });

          const data = await response.json();
          
          if (data.error_code) {
            recognitionResult.innerHTML = `<p>识别失败: ${data.error_msg}</p>`;
            return;
          }

          // 处理识别结果
          let resultHtml = '<h3>识别结果：</h3>';
          let foundMarineSpecies = false;
          let bestMatch = null;
          let bestScore = 0;

          // 显示上传的图片
          resultHtml += `
            <div class="uploaded-image" style="margin: 1rem 0; text-align: center;">
              <img src="${e.target.result}" alt="上传的图片" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
            </div>
          `;

          // 找到最匹配的海洋生物
          data.result.forEach(item => {
            const similarName = findMostSimilar(item.keyword);
            if (similarName && item.score > bestScore) {
              bestMatch = {
                name: similarName,
                score: item.score,
                info: marineInfo[similarName]
              };
              bestScore = item.score;
            }
          });

          // 显示最匹配的结果
          if (bestMatch) {
            foundMarineSpecies = true;
            resultHtml += `
              <div class="recognition-item" style="margin: 1rem 0; padding: 1rem; background: #f5f5f5; border-radius: 8px;">
                <h4 style="margin: 0 0 0.5rem 0;">${bestMatch.name}</h4>
                <p style="margin: 0.5rem 0;">${bestMatch.info.description}</p>
                <p style="margin: 0.5rem 0; color: #666;">相似度: ${(bestMatch.score * 100).toFixed(2)}%</p>
                ${bestMatch.info.details ? `
                  <div class="species-details" style="margin-top: 1rem;">
                    <h5 style="margin: 0.5rem 0;">详细介绍：</h5>
                    <p style="margin: 0.5rem 0;">${bestMatch.info.details}</p>
                  </div>
                ` : ''}
              </div>
            `;
          }

          if (!foundMarineSpecies) {
            resultHtml += '<p>未识别到海洋生物，请尝试上传更清晰的图片。</p>';
          } else {
            shareButtons.style.display = 'block';
          }

          recognitionResult.innerHTML = resultHtml;
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('识别失败:', error);
        recognitionResult.innerHTML = '<p>识别失败，请稍后重试</p>';
      }
    });

  } catch (error) {
    console.error('Error initializing map:', error);
  }

  // 加载保护动物数据
  loadProtectedSpecies();
});

// 将标记点添加逻辑移到单独的函数中
function addSpeciesMarkers(map) {
  const speciesMarkers = {
    // 舟山附近特有物种
    "大黄鱼": { coords: [30.2, 122.3], icon: '🐟', desc: '舟山渔场的重要经济鱼类，肉质鲜美' },
    "小黄鱼": { coords: [30.1, 122.4], icon: '🐟', desc: '舟山海域常见鱼类，体型较小' },
    "带鱼": { coords: [29.8, 122.5], icon: '🐟', desc: '舟山渔场主要经济鱼类之一' },
    "墨鱼": { coords: [30.3, 122.2], icon: '🦑', desc: '舟山海域常见头足类动物' },
    "梭子蟹": { coords: [29.9, 122.6], icon: '🦀', desc: '舟山特产，肉质鲜美' },
    "海蜇": { coords: [30.0, 122.7], icon: '🌊', desc: '舟山海域常见水母类生物' },
    "鲳鱼": { coords: [30.1, 122.1], icon: '🐟', desc: '舟山海域重要的经济鱼类' },
    "马鲛鱼": { coords: [29.9, 122.3], icon: '🐟', desc: '舟山海域常见的大型鱼类' },
    "海鳗": { coords: [30.2, 122.5], icon: '🐍', desc: '舟山海域常见的鳗鱼' },
    "海参": { coords: [29.8, 122.2], icon: '🌊', desc: '舟山海域珍贵的海产品' },
    "贻贝": { coords: [30.0, 122.4], icon: '🐚', desc: '舟山海域常见的贝类' },
    "海带": { coords: [29.9, 122.1], icon: '🌿', desc: '舟山海域重要的藻类' },
    "海螺": { coords: [30.1, 122.6], icon: '🐚', desc: '舟山海域常见的贝类' },
    "海胆": { coords: [30.2, 122.4], icon: '🌊', desc: '舟山海域珍贵的海产品' },
    
    // 原有物种
    "小丑鱼": { coords: [3.5, 128.5], icon: '🐠', desc: '热带海水鱼，与海葵共生' },
    "蓝魔鬼鱼": { coords: [1.5, 130.5], icon: '🐟', desc: '热带海水鱼，体色鲜蓝' },
    "扇贝": { coords: [35, 120], icon: '🐚', desc: '双壳类软体动物，肉质鲜美' },
    "鲍鱼": { coords: [36, 120], icon: '🐚', desc: '名贵海产贝类，壳内有珍珠层' },
    "海马": { coords: [20, 120], icon: '🐴', desc: '独特的鱼类，雄性负责孵化卵' },
    "海龟": { coords: [15, 125], icon: '🐢', desc: '海洋爬行动物，寿命可达数十年' }
  };

  // 存储当前打开的弹窗
  let currentPopup = null;

  // 添加点击地图关闭弹窗的事件监听器
  map.on('click', function(e) {
    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }
  });

  Object.entries(speciesMarkers).forEach(([species, data]) => {
    const icon = L.divIcon({
      className: 'marine-marker',
      html: data.icon,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    
    const marker = L.marker(data.coords, { icon });
    
    marker.on('click', (e) => {
      // 如果已经有弹窗，先移除
      if (currentPopup) {
        currentPopup.remove();
      }
      
      // 创建新的弹窗
      currentPopup = document.createElement('div');
      currentPopup.className = 'species-popup';
      
      if (zhoushanSpeciesInfo[species]) {
        const info = zhoushanSpeciesInfo[species];
        currentPopup.innerHTML = `
          <div class="species-header">
            <div class="species-icon">${data.icon}</div>
            <h3>${info.name}</h3>
            <button class="close-popup">×</button>
          </div>
          <div class="species-image">
            <img src="${info.image}" alt="${info.name}">
          </div>
          <div class="species-info">
            <p class="description">${info.description}</p>
            <div class="info-row">
              <span class="label">栖息地：</span>
              <span class="value">${info.habitat}</span>
            </div>
            <div class="info-row">
              <span class="label">保护状况：</span>
              <span class="value">${info.conservation}</span>
            </div>
          </div>
        `;
      } else {
        currentPopup.innerHTML = `
          <div style="text-align: center; padding: 8px;">
            <div style="font-size: 24px; margin-bottom: 8px;">${data.icon}</div>
            <strong>${species}</strong>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">${data.desc}</p>
            <button class="close-popup">×</button>
          </div>
        `;
      }
      
      // 将弹窗添加到地图容器
      document.body.appendChild(currentPopup);
      
      // 计算弹窗位置
      const markerPoint = map.latLngToContainerPoint(e.latlng);
      const popupWidth = currentPopup.offsetWidth;
      const popupHeight = currentPopup.offsetHeight;
      const mapContainer = map.getContainer();
      const mapRect = mapContainer.getBoundingClientRect();
      
      // 计算弹窗位置，确保完全显示在视图中
      let left = markerPoint.x + mapRect.left;
      let top = markerPoint.y + mapRect.top - popupHeight - 20; // 在标记点上方显示
      
      // 确保弹窗不会超出视图右边界
      if (left + popupWidth > mapRect.right) {
        left = mapRect.right - popupWidth;
      }
      
      // 确保弹窗不会超出视图左边界
      if (left < mapRect.left) {
        left = mapRect.left;
      }
      
      // 如果上方空间不足，则在下方显示
      if (top < mapRect.top) {
        top = markerPoint.y + mapRect.top + 20;
      }
      
      // 设置弹窗位置
      currentPopup.style.left = `${left}px`;
      currentPopup.style.top = `${top}px`;
      
      // 添加关闭按钮事件监听器
      const closeButton = currentPopup.querySelector('.close-popup');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          if (currentPopup) {
            currentPopup.remove();
            currentPopup = null;
          }
        });
      }
    });
    
    marker.addTo(map);
  });
}

// 分享功能
function shareResult() {
  const recognitionItem = document.querySelector('.recognition-item');
  if (!recognitionItem) {
    alert('没有可分享的识别结果');
    return;
  }

  const speciesName = recognitionItem.querySelector('h4').textContent;
  const speciesDesc = recognitionItem.querySelector('p').textContent;
  const text = `我刚刚识别出了一只${speciesName}！${speciesDesc} 快来试试海洋生物识别吧！`;

  if (navigator.share) {
    navigator.share({
      title: '海洋生物识别结果',
      text: text,
      url: window.location.href
    }).catch(error => {
      console.error('分享失败:', error);
      // 如果分享失败，尝试复制到剪贴板
      navigator.clipboard.writeText(text).then(() => {
        alert('已复制到剪贴板！');
      }).catch(err => {
        console.error('复制失败:', err);
        alert('分享和复制都失败了，请手动复制。');
      });
    });
  } else {
    // 如果不支持分享API，直接复制到剪贴板
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板！');
    }).catch(err => {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制。');
    });
  }
}

// 收藏功能
function saveToFavorites() {
  const result = document.querySelector('#recognition-result strong').textContent;
  let favorites = JSON.parse(localStorage.getItem('marineFavorites') || '[]');
  if (!favorites.includes(result)) {
    favorites.push(result);
    localStorage.setItem('marineFavorites', JSON.stringify(favorites));
    alert('已添加到收藏！');
  } else {
    alert('已经在收藏夹中了！');
  }
}

// 评论功能
function submitComment() {
  const commentInput = document.getElementById('comment-input');
  const comment = commentInput.value.trim();
  if (comment) {
    const commentsList = document.getElementById('comments-list');
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.innerHTML = `
      <div class="comment-header">
        <span>匿名用户</span>
        <span>${new Date().toLocaleString()}</span>
      </div>
      <div class="comment-content">${comment}</div>
    `;
    commentsList.insertBefore(commentDiv, commentsList.firstChild);
    commentInput.value = '';
  }
}

// 加载保护动物数据
function loadProtectedSpecies() {
  fetch('data/protected_species.json')
    .then(response => response.json())
    .then(data => {
      // 加载一级保护动物
      const level1Container = document.getElementById('level1-species');
      data.level1.forEach(species => {
        const card = createSpeciesCard(species);
        level1Container.appendChild(card);
      });

      // 加载二级保护动物
      const level2Container = document.getElementById('level2-species');
      data.level2.forEach(species => {
        const card = createSpeciesCard(species);
        level2Container.appendChild(card);
      });

      // 添加自动滚动效果
      startAutoScroll(level1Container);
    })
    .catch(error => console.error('Error loading protected species:', error));
}

function startAutoScroll(container) {
  let scrollPosition = 0;
  const scrollHeight = container.scrollHeight;
  const clientHeight = container.clientHeight;
  let isScrolling = true;
  
  // 添加鼠标悬停事件
  container.addEventListener('mouseenter', () => {
    isScrolling = false;
  });
  
  container.addEventListener('mouseleave', () => {
    isScrolling = true;
  });
  
  // 每50毫秒检查一次是否需要滚动
  setInterval(() => {
    if (!isScrolling) return;
    
    scrollPosition += 1;
    if (scrollPosition >= scrollHeight - clientHeight) {
      // 滚动到底部时，平滑回到顶部
      container.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      scrollPosition = 0;
    } else {
      container.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, 50);
}

// 创建物种卡片
function createSpeciesCard(species) {
  const card = document.createElement('div');
  card.className = 'species-card';
  card.innerHTML = `
    <img src="${species.image}" alt="${species.name}" loading="lazy">
    <div class="info">
      <h4>${species.name}</h4>
      <p>${species.description}</p>
      <div class="details" style="margin-top: 0.5rem; font-size: 0.8rem; color: #666;">
        <p>学名：${species.scientificName}</p>
        <p>分布：${species.distribution}</p>
        <p>保护等级：${species.conservationStatus}</p>
      </div>
    </div>
  `;

  // 添加点击事件
  card.addEventListener('click', () => {
    // 创建模态框
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      padding: 2rem;
    `;

    // 创建内容容器
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 12px;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
    `;

    // 添加关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: none;
      border: none;
      font-size: 2rem;
      cursor: pointer;
      color: #666;
    `;
    closeBtn.addEventListener('click', () => modal.remove());

    // 添加内容
    content.innerHTML = `
      <div style="display: flex; gap: 2rem; margin-bottom: 2rem;">
        <img src="${species.image}" alt="${species.name}" style="width: 300px; height: 300px; object-fit: cover; border-radius: 8px;">
        <div>
          <h2 style="margin: 0 0 1rem 0; color: #1e3c72;">${species.name}</h2>
          <p style="margin: 0 0 0.5rem 0; color: #666;">${species.description}</p>
          <div style="margin-top: 1rem;">
            <p style="margin: 0.5rem 0;"><strong>学名：</strong>${species.scientificName}</p>
            <p style="margin: 0.5rem 0;"><strong>分布：</strong>${species.distribution}</p>
            <p style="margin: 0.5rem 0;"><strong>保护等级：</strong>${species.conservationStatus}</p>
          </div>
        </div>
      </div>
      ${species.details ? `<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
        <h3 style="margin: 0 0 1rem 0; color: #1e3c72;">详细介绍</h3>
        <p style="margin: 0; line-height: 1.6; color: #666;">${species.details}</p>
      </div>` : ''}
    `;

    content.appendChild(closeBtn);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // 点击模态框背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  });

  return card;
} 