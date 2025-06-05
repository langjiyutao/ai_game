// 游戏配置
const gameConfig = {
    // 颜色-文字映射
    textMap: { '红': 'red', '黄': '#FFD600', '蓝': 'blue', '绿': 'green', '紫': 'purple', '粉': 'pink' },


    // 连击奖励配置
    comboRewards: {
        3: { type: 'doubleScore', duration: 5000, message: '双倍分数！' },
        6: { type: 'immunity', value: 1, message: '错误免疫！' },
        10: { type: 'extraTime', value: 5, message: '+5秒时间！' }
    },

    // 成就配置
    achievements: [
        { id: 'combo-master', name: '连击王者', description: '单次达成15连击', icon: 'combo-master.png', condition: player => player.maxCombo >= 15 },
        { id: 'speed-runner', name: '速通达人', description: '1分钟内通关3关', icon: 'speed-runner.png', condition: player => player.clearedLevels >= 3 && player.totalTime <= 60 },
        { id: 'persistent', name: '不屈战神', description: '连续错误5次仍通关', icon: 'persistent.png', condition: player => player.consecutiveErrors >= 5 && player.clearedLevels > 0 }
    ]
};

// 游戏状态
window.gameState = {
    currentScreen: 'main-menu',
    score: 0,
    combo: 0,
    maxCombo: 0,
    time: 0,
    level: 1,
    clearedLevels: 0,
    totalTime: 0,
    consecutiveErrors: 0,
    doubleScoreActive: false,
    doubleScoreInterval: null,
    doubleScoreTimeout: null,
    immunityActive: false,
    immunityCount: 0,
    unlockedAchievements: [],
    currentCorrectOption: null, // 用于基础难度下保存当前正确选项
    debugMode: false, // 调试模式开关
    hasUsedDebugMode: false, // 记录是否曾经使用过调试模式
    totalClicks: 0, // 总点击次数
    correctClicks: 0, // 正确点击次数
    clickTimes: [], // 记录每次正确点击的时间
    lastClickTime: 0, // 上次点击的时间戳
    dynamicDifficulty: { // 动态难度设置
        currentColors: ['red', 'yellow', 'blue'], // 当前使用的颜色
        currentTexts: ['红', '黄', '蓝'], // 当前使用的文字
        optionsCount: 4, // 当前选项数量
        nextLevelThreshold: 70 // 下一级难度的分数阈值
    },
    coverTimer: null, // 遮盖定时器
    coverInterval: null, // 遮盖间隔定时器
    _adModalShown: false, // 新增广告弹窗标记
    advancedUnlockModalShown: false // 新增进阶玩法解锁弹窗标记
};

// DOM元素引用
const elements = {
    screens: {
        mainMenu: document.getElementById('main-menu'),
        rules: document.getElementById('rules-screen'),
        achievements: document.getElementById('achievements-screen'),
        game: document.getElementById('game-screen'),
        result: document.getElementById('result-screen'),
        advanced: document.getElementById('advanced-screen')
    },
    buttons: {
        startGame: document.getElementById('start-game'),
        showRules: document.getElementById('show-rules'),
        showAchievements: document.getElementById('show-achievements'),
        backFromRules: document.getElementById('back-from-rules'),
        backFromAchievements: document.getElementById('back-from-achievements'),
        playAgain: document.getElementById('play-again'),
        shareResult: document.getElementById('share-result'),
        backToMenu: document.getElementById('back-to-menu'),
        startAdvanced: document.getElementById('start-advanced')
    },
    game: {
        score: document.getElementById('score'),
        time: document.getElementById('time'),
        level: document.getElementById('level'),
        promptContainer: document.getElementById('prompt-container'),
        optionsContainer: document.getElementById('options-container'),
        rewardsContainer: document.getElementById('rewards-container'),
        countdown: document.getElementById('countdown'),
        countdownNumber: document.querySelector('.countdown-number'),
        comboIndicator: document.getElementById('combo-indicator'),
        comboNumber: document.querySelector('.combo-number')
    },
    result: {
        finalScore: document.getElementById('final-score'),
        maxCombo: document.getElementById('max-combo'),
        clearedLevels: document.getElementById('cleared-levels'),
        accuracy: document.getElementById('accuracy'),
        fastestTime: document.getElementById('fastest-time'),
        averageTime: document.getElementById('average-time'),
        unlockedContainer: document.getElementById('unlocked-container')
    },
    sounds: {
        click: document.getElementById('click-sound'),
        correct: document.getElementById('correct-sound'),
        wrong: document.getElementById('wrong-sound'),
        combo: document.getElementById('combo-sound'),
        levelUp: document.getElementById('level-up-sound'),
        win: document.getElementById('win-sound'),
        bgm: document.getElementById('bgm-sound'),
        home: document.getElementById('home-sound'),
        // 连击欢呼音效
        yay1: document.getElementById('yay1-sound'),
        yay2: document.getElementById('yay2-sound'),
        yay3: document.getElementById('yay3-sound'),
        yay4: document.getElementById('yay4-sound'),
        // 快速反应音效
        nioce: document.getElementById('nioce-sound')
    }
};

// 预加载图片资源
function preloadImages() {
    const imageList = [
        'images/optionBtn.png',
        'images/whiteBtn.png',
        'images/mascot-normal.png',
        'images/cat.png',
        'images/cat_flipped.png',
        'images/dog.png',
        'images/dog_flipped.png',
        'images/thomas.png',
        // 如有其他图片请补充
    ];
    imageList.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// 初始化游戏
function initGame() {
    preloadImages();
    loadSavedData();
    setupEventListeners();
    setupDebugMode();
    renderAchievements();

    // 初始化2D标题
    if (typeof window.init2DTitle === 'function') {
        window.init2DTitle();
    }

    // 设置点击继续功能
    setupClickToContinue();

    // 显示主菜单（但菜单选项隐藏，等待点击）
    showScreen('mainMenu');
    
    // 设置进阶模式
    setupAdvancedMode();
}

// 设置点击继续功能
function setupClickToContinue() {
    const clickOverlay = document.getElementById('click-to-continue');
    const menuOptions = document.querySelector('.menu-options');

    if (clickOverlay) {
        clickOverlay.addEventListener('click', function () {
            // 播放主菜单音乐
            playHomeMusic();

            // 显示菜单选项并添加动画
            menuOptions.style.display = 'flex';
            
            // 为每个按钮添加延迟出现的动画
            const buttons = menuOptions.querySelectorAll('.btn');
            buttons.forEach((button, index) => {
                button.style.opacity = '0';
                button.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    button.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    button.style.opacity = '1';
                    button.style.transform = 'translateY(0)';
                }, 100 * (index + 1)); // 每个按钮延迟100ms * index出现
            });

            // 隐藏点击提示层
            clickOverlay.style.display = 'none';
        });
    }
}

// 设置调试模式
function setupDebugMode() {
    // 添加键盘事件监听器，按下Ctrl+D切换调试模式
    document.addEventListener('keydown', function (event) {
        // 检测Ctrl+D组合键
        if (event.ctrlKey && event.key === 'd') {
            // 阻止默认行为（浏览器的书签功能）
            event.preventDefault();

            // 切换调试模式
            gameState.debugMode = !gameState.debugMode;

            // 如果开启了调试模式，记录使用过调试模式的标记
            if (gameState.debugMode) {
                gameState.hasUsedDebugMode = true;
                // 不再保存到localStorage
            }

            // 显示调试模式状态
            const message = gameState.debugMode ? '调试模式已开启！所有点击都将视为正确' : '调试模式已关闭';
            showDebugMessage(message);
            
            // 如果开启了调试模式，显示Thomas彩蛋
            if (gameState.debugMode) {
                showThomasEasterEgg();
            }

            console.log('Debug mode:', gameState.debugMode);
        }
    });
}

// 显示Thomas彩蛋
function showThomasEasterEgg() {
    // 应用到游戏容器
    const gameContainer = document.querySelector('.game-container');
    // 创建Thomas彩蛋元素
    const thomasElement = document.createElement('div');
    thomasElement.className = 'thomas-easter-egg';
    gameContainer.appendChild(thomasElement);
    
    // 延迟一点显示，以便CSS过渡效果生效
    setTimeout(() => {
        thomasElement.classList.add('show');
        
        // 1秒后开始淡出
        setTimeout(() => {
            thomasElement.classList.add('hide');
            thomasElement.classList.remove('show');
            
            // 淡出动画完成后移除元素
            setTimeout(() => {
                thomasElement.remove();
            }, 500);
        }, 1000);
    }, 100);
}

// 显示调试信息
function showDebugMessage(message) {
    const debugMessage = document.createElement('div');
    debugMessage.className = 'debug-message';
    debugMessage.textContent = message;

    document.body.appendChild(debugMessage);

    // 2秒后移除消息
    setTimeout(() => {
        debugMessage.classList.add('fade-out');
        setTimeout(() => {
            debugMessage.remove();
        }, 500);
    }, 1500);
}

// 导出调试消息函数，供其他模块使用
window.showDebugMessage = showDebugMessage;
window.showThomasEasterEgg = showThomasEasterEgg;

// 加载保存的游戏数据
function loadSavedData() {
    const savedData = localStorage.getItem('colorWordGame');
    if (savedData) {
        const data = JSON.parse(savedData);
        gameState.unlockedAchievements = data.unlockedAchievements || [];
        gameState.maxCombo = data.maxCombo || 0;
        gameState.clearedLevels = data.clearedLevels || 0;
        // 新增：读取进阶玩法解锁状态
        gameState.advancedUnlockModalShown = !!data.advancedUnlockModalShown;
        window.advancedUnlockModalShown = gameState.advancedUnlockModalShown;
        // 不从localStorage读取hasUsedDebugMode，保持为false
    }
}

// 保存游戏数据
function saveGameData() {
    const dataToSave = {
        unlockedAchievements: gameState.unlockedAchievements,
        maxCombo: gameState.maxCombo,
        clearedLevels: gameState.clearedLevels,
        // 新增：保存进阶玩法解锁状态
        advancedUnlockModalShown: !!gameState.advancedUnlockModalShown
        // 不保存hasUsedDebugMode到localStorage
    };
    localStorage.setItem('colorWordGame', JSON.stringify(dataToSave));
}

// 设置事件监听器
function setupEventListeners() {
    // 主菜单按钮
    elements.buttons.startGame.addEventListener('click', () => {
        elements.sounds.click.play();
        // 直接开始游戏，不再显示难度选择界面
        startGame();
    });
    elements.buttons.showRules.addEventListener('click', () => {
        elements.sounds.click.play();
        showScreen('rules');
    });
    elements.buttons.showAchievements.addEventListener('click', () => {
        elements.sounds.click.play();
        renderAchievements();
        showScreen('achievements');
    });
    
    // 添加窗口大小改变事件监听
    window.addEventListener('resize', function() {
        adjustOptionButtonTextSize();
    });

    // 对于移动设备，添加屏幕方向改变事件
    window.addEventListener('orientationchange', function() {
        // 延迟执行以确保DOM已更新
        setTimeout(adjustOptionButtonTextSize, 100);
    });

    // 返回按钮
    elements.buttons.backFromRules.addEventListener('click', () => {
        elements.sounds.click.play();
        showScreen('mainMenu');
    });
    elements.buttons.backFromAchievements.addEventListener('click', () => {
        elements.sounds.click.play();
        showScreen('mainMenu');
    });
    //     elements.sounds.click.play();
    //     showScreen('mainMenu');
    // });

    // 结果界面按钮
    elements.buttons.playAgain.addEventListener('click', () => {
        elements.sounds.click.play();
        // 直接开始游戏，不再显示难度选择界面
        startGame();
    });
    elements.buttons.backToMenu.addEventListener('click', () => {
        elements.sounds.click.play();
        showScreen('mainMenu');
    });
    elements.buttons.shareResult.addEventListener('click', () => {
        elements.sounds.click.play();
        shareResult();
    });

    // 进阶玩法相关
    elements.buttons.startAdvanced.addEventListener('click', () => {
        showScreen('advanced');
        startAdvancedGame();
    });
}

// 更新难度按钮状态
function updateDifficultyButtons() {
    elements.buttons.difficultyOptions.medium.disabled = !gameState.unlockedDifficulties.includes('medium');
    elements.buttons.difficultyOptions.hard.disabled = !gameState.unlockedDifficulties.includes('hard');
}

// 显示指定屏幕
function showScreen(screenName) {
    // 停止任何可能正在运行的计时器
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }

    // 当离开游戏屏幕时，清理所有奖励定时器
    if (gameState.currentScreen === 'game' && screenName !== 'game') {
        if (gameState.doubleScoreInterval) {
            clearInterval(gameState.doubleScoreInterval);
            gameState.doubleScoreInterval = null;
        }
        if (gameState.doubleScoreTimeout) {
            clearTimeout(gameState.doubleScoreTimeout);
            gameState.doubleScoreTimeout = null;
        }
        // 重置奖励状态
        gameState.doubleScoreActive = false;
        gameState.immunityActive = false;
        gameState.immunityCount = 0;
    }

    // 处理音乐切换
    if (screenName === 'game' || screenName === 'advanced') {
        // 进入游戏屏幕或进阶玩法，播放游戏背景音乐
        playBackgroundMusic();
    } else {
        // 任何非游戏屏幕，播放主菜单音乐
        playHomeMusic();
    }

    // 隐藏所有屏幕
    Object.values(elements.screens).forEach(screen => {
        screen.classList.remove('active');
    });

    // 显示指定屏幕
    elements.screens[screenName].classList.add('active');

    // 更新当前屏幕
    gameState.currentScreen = screenName;
}

// 开始游戏
function startGame() {
    // 重置游戏状态
    gameState.score = 0;
    gameState.combo = 0;
    gameState.level = 1;
    gameState.consecutiveErrors = 0;
    gameState.totalTime = 0;
    gameState.doubleScoreActive = false;
    gameState.doubleScoreInterval = null;
    gameState.doubleScoreTimeout = null;
    gameState.immunityActive = false;
    gameState.immunityCount = 0;

    // 重置统计数据
    gameState.totalClicks = 0;
    gameState.correctClicks = 0;
    gameState.clickTimes = [];
    gameState.lastClickTime = 0;
    
    // 清空奖励容器
    elements.game.rewardsContainer.innerHTML = '';
    
    // 初始化宠物管理器
    petManager.init();

    // 重置动态难度
    gameState.dynamicDifficulty = {
        currentColors: ['red', 'yellow', 'blue'],
        currentTexts: ['红', '黄', '蓝'],
        optionsCount: 4,
        nextLevelThreshold: 70
    };

    // 设置初始时间
    gameState.time = 30; // 初始时间设置为30秒

    // 重置广告弹窗标记，允许新一局再看广告
    gameState._adModalShown = false;

    // 更新UI
    updateGameUI();

    // 重置连击指示器
    elements.game.comboIndicator.classList.remove('active');
    elements.game.comboIndicator.classList.remove('milestone');

    // 播放背景音乐
    playBackgroundMusic();

    // 显示游戏屏幕
    showScreen('game');

    // 开始倒计时
    startCountdown();

    // 清理所有旧遮罩
    document.querySelectorAll('.cover-flip-effect').forEach(e => e.remove());
    document.querySelectorAll('.option-btn.covered').forEach(e => e.classList.remove('covered'));
}

// 播放背景音乐
function playBackgroundMusic() {
    // 停止主菜单音乐
    elements.sounds.home.pause();
    elements.sounds.home.currentTime = 0;

    // 重置音乐到开头
    elements.sounds.bgm.currentTime = 0;
    // 设置音量
    elements.sounds.bgm.volume = 0.5;
    // 播放音乐
    elements.sounds.bgm.play().catch(error => {
        console.log('背景音乐播放失败:', error);
    });
}

// 停止背景音乐
function stopBackgroundMusic() {
    elements.sounds.bgm.pause();
    elements.sounds.bgm.currentTime = 0;
}

// 开始倒计时
function startCountdown() {
    let count = 3;
    elements.game.countdown.style.display = 'flex';
    elements.game.countdownNumber.textContent = count;

    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            elements.game.countdownNumber.textContent = count;
        } else {
            clearInterval(countdownInterval);
            elements.game.countdown.style.display = 'none';
            startRound();
        }
    }, 1000);
}

// 开始一轮游戏
function startRound() {
    // 清空选项容器和提示容器
    elements.game.optionsContainer.innerHTML = '';
    elements.game.promptContainer.innerHTML = '';

    // 记录本轮开始时间
    gameState.lastClickTime = Date.now();

    // 清除上轮遮盖定时器
    if (gameState.coverTimer) {
        clearTimeout(gameState.coverTimer);
        gameState.coverTimer = null;
    }
    if (gameState.coverInterval) {
        clearInterval(gameState.coverInterval);
        gameState.coverInterval = null;
    }
    // 移除所有旧遮盖
    document.querySelectorAll('.cover-flip-effect').forEach(e => e.remove());
    document.querySelectorAll('.option-btn.covered').forEach(e => e.classList.remove('covered'));

    // 使用动态难度生成游戏内容
    generateDynamicRound();

    // 关卡>=5时，1秒后开始间隔1秒切换遮盖目标
    if (gameState.level >= 5) {
        const coverCount = Math.min(8, Math.floor((gameState.level - 5) / 5) + 1);
        gameState.coverTimer = setTimeout(() => {
            // 首次遮盖
            switchCoverTargets(coverCount);
            // 之后每隔1秒切换
            gameState.coverInterval = setInterval(() => {
                switchCoverTargets(coverCount);
            }, 1000);
        }, 1000);
    }

    // 开始计时器
    startTimer();
}

// 生成动态难度的一轮游戏
function generateDynamicRound() {
    // 根据当前级别生成选项
    const dynamicSettings = gameState.dynamicDifficulty;

    // 如果是第一关，只使用基础模式
    if (gameState.level === 1) {
        generateBasicRound();
    } else {
        // 第二关开始，随机选择玩法
        if (Math.random() < 0.5) {
            generateBasicRound();
        } else {
            generateAdvancedRound();
        }
    }
}

// 生成基础模式的一轮游戏
function generateBasicRound() {
    const dynamicSettings = gameState.dynamicDifficulty;

    // 1. 随机选择一个颜色和一个不同的文字
    const colorIndex = Math.floor(Math.random() * dynamicSettings.currentColors.length);
    let textIndex;
    do {
        textIndex = Math.floor(Math.random() * dynamicSettings.currentTexts.length);
    } while (gameConfig.textMap[dynamicSettings.currentTexts[textIndex]] === dynamicSettings.currentColors[colorIndex]);

    const targetColor = dynamicSettings.currentColors[colorIndex];
    const targetText = dynamicSettings.currentTexts[textIndex];

    // 2. 创建提示词，突出显示"对应"
    const prompt = document.createElement('div');
    prompt.innerHTML = `请点击<span class="highlight">"对应"</span>的字：${getColorName(targetColor)} 的 ${targetText}`;
    elements.game.promptContainer.appendChild(prompt);

    // 3. 创建正确选项
    const correctOption = createOptionButton(targetColor, targetText, false, 'basic');

    // 4. 创建错误选项
    const wrongOptions = [];
    for (let i = 0; i < dynamicSettings.optionsCount - 1; i++) {
        let wrongColor, wrongText;

        // 确保错误选项与正确选项不同
        do {
            // 生成颜色相同但文字不同的选项，或文字相同但颜色不同的选项
            wrongText = dynamicSettings.currentTexts[Math.floor(Math.random() * (dynamicSettings.currentTexts.length))];
            wrongColor = dynamicSettings.currentColors[Math.floor(Math.random() * (dynamicSettings.currentColors.length))];
            // 确保这个错误选项不符合"颜色≠文字"的正确条件
        } while (wrongColor == targetColor && wrongText == targetText);

        wrongOptions.push(createOptionButton(wrongColor, wrongText, false, 'basic'));
    }

    // 5. 随机排列所有选项
    const allOptions = [correctOption, ...wrongOptions];
    shuffleArray(allOptions);

    // 6. 添加到容器
    elements.game.optionsContainer.innerHTML = ''; // 清空容器

    // 根据选项数量调整容器的列数
    adjustOptionsContainerColumns(dynamicSettings.optionsCount);

    // 添加选项到容器
    allOptions.forEach(option => {
        elements.game.optionsContainer.appendChild(option);
    });

    // 保存当前正确选项信息，用于判断
    gameState.currentCorrectOption = {
        color: targetColor,
        text: targetText,
        mode: 'basic'
    };
    
    // 调整选项按钮文字大小
    adjustOptionButtonTextSize();
}

// 生成高级模式的一轮游戏
function generateAdvancedRound() {
    const dynamicSettings = gameState.dynamicDifficulty;

    // 清空选项容器
    elements.game.optionsContainer.innerHTML = '';

    // 创建提示词，突出显示"不同"
    const prompt = document.createElement('div');
    prompt.innerHTML = `点击颜色与文字<span class="highlight">"不同"</span>的选项`;
    elements.game.promptContainer.appendChild(prompt);

    // 生成选项
    const options = [];
    let hasCorrectOption = false;

    // 确保至少有一个正确选项（颜色≠文字）
    for (let i = 0; i < dynamicSettings.optionsCount; i++) {
        let color, text, isDistractor = false;

        // 最后一个选项，如果还没有正确选项，强制生成一个
        if (i === dynamicSettings.optionsCount - 1 && !hasCorrectOption) {
            // 强制生成一个正确选项（颜色≠文字）
            do {
                color = dynamicSettings.currentColors[Math.floor(Math.random() * dynamicSettings.currentColors.length)];
                text = dynamicSettings.currentTexts[Math.floor(Math.random() * dynamicSettings.currentTexts.length)];
            } while (color === gameConfig.textMap[text]);
            hasCorrectOption = true;
        } else {
            // 随机生成选项，有50%概率是正确的（颜色≠文字）
            if (Math.random() < 0.5 && !hasCorrectOption) {
                // 生成正确选项（颜色≠文字）
                do {
                    color = dynamicSettings.currentColors[Math.floor(Math.random() * dynamicSettings.currentColors.length)];
                    text = dynamicSettings.currentTexts[Math.floor(Math.random() * dynamicSettings.currentTexts.length)];
                } while (color === gameConfig.textMap[text]);
                hasCorrectOption = true;
            } else {
                // 生成错误选项（颜色=文字）
                text = dynamicSettings.currentTexts[Math.floor(Math.random() * dynamicSettings.currentTexts.length)];
                color = gameConfig.textMap[text];
            }
        }

        options.push(createOptionButton(color, text, isDistractor, 'advanced'));
    }

    // 随机排列所有选项
    shuffleArray(options);

    // 根据选项数量调整容器的列数
    adjustOptionsContainerColumns(dynamicSettings.optionsCount);

    // 添加到容器
    options.forEach(option => {
        elements.game.optionsContainer.appendChild(option);
    });

    // 保存当前游戏模式
    gameState.currentCorrectOption = {
        mode: 'advanced'
    };
    
    // 调整选项按钮文字大小
    adjustOptionButtonTextSize();
}

// 创建选项按钮
function createOptionButton(color, text, isDistractor, mode) {
    const button = document.createElement('button');
    button.className = 'option-btn appearing';
    button.style.color = color;
    button.textContent = text;
    button.dataset.mode = mode; // 添加模式标记
    
    // 随机分配晃动动画类型
    const swayClass = Math.random() < 0.5 ? 'optionSwayBounce1' : 'optionSwayBounce2';
    button.dataset.swayClass = swayClass;
    
    // 添加动画结束事件监听器
    button.addEventListener('animationend', function(e) {
        if (e.animationName === 'optionAppear') {
            button.classList.remove('appearing');
            // 应用晃动效果
            button.classList.add(button.dataset.swayClass);
            
            // 调整文字大小
            adjustOptionButtonTextSize();
        }
    });

    // 添加点击事件
    button.addEventListener('click', () => {
        handleButtonClick(button);
    });

    return button;
}

// 处理按钮点击
function handleButtonClick(button) {
    // 玩家点击时清除遮盖定时器和interval，并移除所有遮盖
    if (gameState.coverTimer) {
        clearTimeout(gameState.coverTimer);
        gameState.coverTimer = null;
    }
    if (gameState.coverInterval) {
        clearInterval(gameState.coverInterval);
        gameState.coverInterval = null;
    }
    document.querySelectorAll('.cover-flip-effect').forEach(e => e.remove());
    document.querySelectorAll('.option-btn.covered').forEach(e => e.classList.remove('covered'));
    const mode = gameState.currentCorrectOption.mode;
    
    // 禁用所有选项按钮，防止重复点击
    const allOptions = document.querySelectorAll('.option-btn');
    allOptions.forEach(option => {
        option.disabled = true;
        option.style.pointerEvents = 'none';
    });

    // 在调试模式下，所有点击都视为正确
    if (gameState.debugMode) {
        handleCorrectAnswer(button);
    } else {
        if (mode === 'basic') {
            handleBasicModeClick(button);
        } else {
            handleAdvancedModeClick(button);
        }
    }

    // 检查是否需要进入下一关
    checkLevelProgress();

    // 开始新一轮
    startRound();
}

// 处理基础模式的点击
function handleBasicModeClick(button) {
    const targetColor = button.style.color;
    const targetText = button.textContent;

    // 检查是否是正确选项
    if (targetColor === gameState.currentCorrectOption.color &&
        targetText === gameState.currentCorrectOption.text) {
        // 正确
        handleCorrectAnswer(button);
    } else {
        // 错误
        handleWrongAnswer(button);
    }
}

// 处理高级模式的点击
function handleAdvancedModeClick(button) {
    const targetColor = button.style.color;
    const targetText = button.textContent;

    if (targetColor === gameConfig.textMap[targetText]) {
        // 错误：颜色=文字
        handleWrongAnswer(button);
    } else {
        // 正确：颜色≠文字
        handleCorrectAnswer(button);
    }
}

// 获取颜色名称
function getColorName(color) {
    const colorNames = {
        'red': '红色',
        'yellow': '黄色',
        'blue': '蓝色',
        'green': '绿色',
        'purple': '紫色',
        'pink': '粉色'
    };
    return colorNames[color] || color;
}

// 打乱数组顺序
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 处理正确答案
function handleCorrectAnswer(button) {
    // 记录点击统计
    gameState.totalClicks++;
    gameState.correctClicks++;

    // 计算并记录反应时间
    const clickTime = Date.now();
    const reactionTime = (clickTime - gameState.lastClickTime) / 1000; // 转换为秒
    gameState.clickTimes.push(reactionTime);

    // 播放正确音效
    elements.sounds.correct.currentTime = 0;
    elements.sounds.correct.play();
    
    // 如果反应时间小于1.3秒，播放快速反应音效
    if (reactionTime < 1.3) {
        elements.sounds.nioce.currentTime = 0;
        elements.sounds.nioce.play();
        
        // 显示快速反应提示
        showGameNotification('反应神速！', 'floating');
    }

    // 显示正确提示
    // showFeedbackMessage('正确！', 'correct');

    // 高亮显示正确选项
    button.classList.add('correct');
    setTimeout(() => {
        button.classList.remove('correct');
    }, 800);

    // 增加分数
    const baseScore = 10;
    let scoreToAdd = gameState.doubleScoreActive ? baseScore * 2 : baseScore;
    gameState.score += scoreToAdd;

    // 显示得分特效
    showScoreEffect(button, `+${scoreToAdd}`);

    // 增加连击
    gameState.combo++;
    if (gameState.combo > gameState.maxCombo) {
        gameState.maxCombo = gameState.combo;
    }

    // 播放连击欢呼音效
    playComboYaySound(gameState.combo);

    // 显示连击效果
    showComboEffect(button);

    // 检查连击奖励
    checkComboRewards();

    // 重置连续错误计数
    gameState.consecutiveErrors = 0;

    // 更新UI
    updateGameUI();
}

// 处理错误答案
function handleWrongAnswer(button) {
    // 记录点击统计
    gameState.totalClicks++;

    // 如果有免疫，则不计错误
    if (gameState.immunityActive) {
        // 减少免疫次数
        gameState.immunityCount--;
        
        // 如果免疫次数为0，关闭免疫状态
        if (gameState.immunityCount <= 0) {
            gameState.immunityActive = false;
            
            // 移除免疫图标
            const immunityIcon = document.getElementById('immunity-reward');
            if (immunityIcon) {
                immunityIcon.classList.add('disappearing');
                setTimeout(() => {
                    immunityIcon.remove();
                }, 500);
            }
        } else {
            // 如果还有免疫次数，更新显示并添加抖动效果
            const immunityIcon = document.getElementById('immunity-reward');
            if (immunityIcon) {
                // 更新免疫次数显示
                const countElement = immunityIcon.querySelector('.immunity-count');
                if (countElement) {
                    countElement.textContent = gameState.immunityCount;
                }
                
                // 添加抖动效果
                immunityIcon.classList.add('shake');
                setTimeout(() => {
                    immunityIcon.classList.remove('shake');
                }, 500);
            }
        }
        
        showGameNotification('免疫生效！', 'floating');
        return;
    }

    // 播放错误音效
    elements.sounds.wrong.currentTime = 0;
    elements.sounds.wrong.play();

    // 显示错误提示
    // showFeedbackMessage('错误！', 'wrong');

    // 显示错误特效
    showScoreEffect(button, '❌');

    // 高亮显示错误选项
    button.classList.add('wrong');
    setTimeout(() => {
        button.classList.remove('wrong');
    }, 800);

    // 添加抖动效果
    button.classList.add('shake');
    setTimeout(() => {
        button.classList.remove('shake');
    }, 500);

    // 重置连击
    gameState.combo = 0;

    // 增加连续错误计数
    gameState.consecutiveErrors++;

    // 减少时间
    gameState.time = Math.max(0, gameState.time - 1);

    // 更新UI
    updateGameUI();
}

// 显示反馈信息
function showFeedbackMessage(message, type) {
    const feedbackMessage = document.createElement('div');
    feedbackMessage.className = `feedback-message feedback-${type}`;
    feedbackMessage.textContent = message;

    elements.screens.game.appendChild(feedbackMessage);

    // 延迟移除元素
    setTimeout(() => {
        feedbackMessage.remove();
    }, 1000);
}

// 显示连击效果
function showComboEffect(button) {
    const comboEffect = document.createElement('div');
    comboEffect.className = 'combo-effect';
    comboEffect.textContent = `${gameState.combo}连击!`;
    comboEffect.style.left = `${button.offsetLeft + button.offsetWidth / 2}px`;
    comboEffect.style.top = `${button.offsetTop}px`;

    elements.game.optionsContainer.appendChild(comboEffect);

    setTimeout(() => {
        comboEffect.remove();
    }, 1000);
}

// 检查连击奖励
function checkComboRewards() {
    const comboMilestones = Object.keys(gameConfig.comboRewards).map(Number);

    for (const milestone of comboMilestones) {
        if (gameState.combo > 0 && gameState.combo % milestone === 0) {
            const reward = gameConfig.comboRewards[milestone];

            // 播放连击音效
            elements.sounds.combo.play();

            // 应用奖励效果
            applyComboReward(reward);

            // 显示奖励效果
            showGameNotification(reward.message, 'floating');
        }
    }
}

// 应用连击奖励
function applyComboReward(reward) {
    switch (reward.type) {
        case 'doubleScore':
            // 检查是否已有双倍分数奖励
            const existingDoubleScoreIcon = document.getElementById('double-score-reward');
            
            if (existingDoubleScoreIcon) {
                // 如果已存在双倍分数奖励，只延长时间
                
                // 获取当前倒计时元素
                const timer = existingDoubleScoreIcon.querySelector('.double-score-timer');
                
                // 获取当前剩余时间（秒）
                const currentTimeLeft = parseInt(timer.textContent);
                
                // 计算新的总时间（当前剩余时间 + 新奖励时间）
                const newDuration = currentTimeLeft * 1000 + reward.duration;
                
                // 更新倒计时显示
                timer.textContent = Math.ceil(newDuration / 1000);
                
                // 添加闪烁效果表示更新
                existingDoubleScoreIcon.classList.add('updated');
                setTimeout(() => {
                    existingDoubleScoreIcon.classList.remove('updated');
                }, 500);
                
                // 清除旧的定时器
                if (gameState.doubleScoreInterval) {
                    clearInterval(gameState.doubleScoreInterval);
                }
                if (gameState.doubleScoreTimeout) {
                    clearTimeout(gameState.doubleScoreTimeout);
                }
                
                // 记录开始时间
                const startTime = Date.now();
                
                // 设置新的倒计时更新
                gameState.doubleScoreInterval = setInterval(() => {
                    const timeLeft = Math.ceil((newDuration - (Date.now() - startTime)) / 1000);
                    if (timeLeft <= 0) {
                        clearInterval(gameState.doubleScoreInterval);
                        existingDoubleScoreIcon.classList.add('disappearing');
                        setTimeout(() => {
                            existingDoubleScoreIcon.remove();
                        }, 500);
                    } else {
                        timer.textContent = timeLeft;
                    }
                }, 1000);
                
                // 设置新的定时器结束双倍分数
                gameState.doubleScoreTimeout = setTimeout(() => {
                    gameState.doubleScoreActive = false;
                }, newDuration);
            } else {
                // 如果不存在，创建新的双倍分数奖励
                gameState.doubleScoreActive = true;
                
                // 创建双倍分数图标
                const doubleScoreIcon = document.createElement('div');
                doubleScoreIcon.className = 'reward-icon';
                doubleScoreIcon.id = 'double-score-reward';
                
                // 添加2x图标
                const iconText = document.createElement('div');
                iconText.className = 'double-score-icon';
                iconText.textContent = '2x';
                doubleScoreIcon.appendChild(iconText);
                
                // 添加倒计时
                const timer = document.createElement('div');
                timer.className = 'double-score-timer';
                timer.textContent = Math.ceil(reward.duration / 1000);
                doubleScoreIcon.appendChild(timer);
                
                // 添加到奖励容器
                elements.game.rewardsContainer.appendChild(doubleScoreIcon);

                doubleScoreIcon.classList.add('appearing');
                setTimeout(() => {
                    doubleScoreIcon.classList.remove('appearing');
                }, 500);
                
                // 记录开始时间
                const startTime = Date.now();
                
                // 倒计时更新
                gameState.doubleScoreInterval = setInterval(() => {
                    const timeLeft = Math.ceil((reward.duration - (Date.now() - startTime)) / 1000);
                    if (timeLeft <= 0) {
                        clearInterval(gameState.doubleScoreInterval);
                        doubleScoreIcon.classList.add('disappearing');
                        setTimeout(() => {
                            doubleScoreIcon.remove();
                        }, 500);
                    } else {
                        timer.textContent = timeLeft;
                    }
                }, 1000);
                
                // 设置定时器结束双倍分数
                gameState.doubleScoreTimeout = setTimeout(() => {
                    gameState.doubleScoreActive = false;
                }, reward.duration);
            }
            break;

        case 'extraTime':
            gameState.time += reward.value;
            updateGameUI();
            
            // 显示额外时间奖励提示
            showGameNotification(reward.message, 'floating');
            
            // 添加时间数字弹跳动画
            const timeElement = elements.game.time;
            timeElement.classList.add('number-bounce');
            
            // 动画结束后移除类
            setTimeout(() => {
                timeElement.classList.remove('number-bounce');
            }, 600);
            
            break;

        case 'immunity':
            // 增加免疫次数
            gameState.immunityCount += reward.value;
            gameState.immunityActive = true;
            
            // 检查是否已有免疫图标
            let immunityIcon = document.getElementById('immunity-reward');
            
            if (!immunityIcon) {
                // 创建新的免疫图标
                immunityIcon = document.createElement('div');
                immunityIcon.className = 'reward-icon';
                immunityIcon.id = 'immunity-reward';
                
                // 添加盾牌图标
                const shieldIcon = document.createElement('div');
                shieldIcon.className = 'immunity-icon';
                immunityIcon.appendChild(shieldIcon);
                
                // 如果免疫次数大于1，添加计数器
                if (gameState.immunityCount > 1) {
                    const countElement = document.createElement('div');
                    countElement.className = 'immunity-count';
                    countElement.textContent = gameState.immunityCount;
                    immunityIcon.appendChild(countElement);
                }
                
                // 添加到奖励容器
                elements.game.rewardsContainer.appendChild(immunityIcon);

                immunityIcon.classList.add('appearing');
                setTimeout(() => {
                    immunityIcon.classList.remove('appearing');
                }, 500);
            } else {
                // 更新现有免疫图标的计数
                let countElement = immunityIcon.querySelector('.immunity-count');
                
                if (gameState.immunityCount > 1) {
                    if (!countElement) {
                        // 如果计数元素不存在但需要显示，创建它
                        countElement = document.createElement('div');
                        countElement.className = 'immunity-count';
                        immunityIcon.appendChild(countElement);
                    }
                    countElement.textContent = gameState.immunityCount;
                }
                
                // 添加闪烁效果表示更新
                immunityIcon.classList.add('updated');
                setTimeout(() => {
                    immunityIcon.classList.remove('updated');
                }, 500);
            }
            break;
    }
}

// 显示游戏提示效果
function showGameNotification(message, type = 'bonus') {
    // 创建提示元素
    const notification = document.createElement('div');
    
    if (type === 'bonus') {
        // 中央大提示（原bonus-effect风格）
        notification.className = 'game-notification bonus-style';
        notification.textContent = message;
        
        // 添加到游戏屏幕
        elements.screens.game.appendChild(notification);
        
        // 延迟移除元素
        setTimeout(() => {
            notification.remove();
        }, 2000);
    } else if (type === 'floating') {
        // 浮动提示（原fast-reaction-effect风格）
        notification.className = 'game-notification floating-style';
        notification.textContent = message;
        
        // 设置初始位置（game-screen底部随机位置）
        const gameScreen = elements.screens.game;
        const gameRect = gameScreen.getBoundingClientRect();
        
        // 随机水平位置（留出边距，避免文字被截断）
        const randomX = Math.random() * (gameRect.width - 200) + 100; // 100px边距
        // 固定在game-screen底部
        const bottomY = gameRect.height - 80; // 距离game-screen底部80px
        
        notification.style.left = `${randomX}px`;
        notification.style.top = `${bottomY}px`;
        
        // 添加到游戏屏幕
        elements.screens.game.appendChild(notification);
        
        // 添加动画类
        setTimeout(() => {
            notification.classList.add('animate');
        }, 10);
        
        // 动画结束后移除元素
        setTimeout(() => {
            notification.remove();
        }, 1500);
    }
}

// 开始计时器
function startTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    gameState.timerInterval = setInterval(() => {
        gameState.time -= 0.1;
        gameState.totalTime += 0.1;

        if (gameState.time <= 0) {
            clearInterval(gameState.timerInterval);
            endGame();
        }

        updateGameUI();
    }, 100);
}

// 检查关卡进度
function checkLevelProgress() {
    const dynamicSettings = gameState.dynamicDifficulty;
    const targetScore = dynamicSettings.nextLevelThreshold;

    if (gameState.score >= targetScore) {
        // 升级
        gameState.level++;
        gameState.clearedLevels++;

        // 播放升级音效
        elements.sounds.levelUp.play();

        // 增加时间奖励
        gameState.time += 5;

        // 添加时间数字弹跳动画
        const timeElement = elements.game.time;
        timeElement.classList.add('number-bounce');
        
        // 动画结束后移除类
        setTimeout(() => {
            timeElement.classList.remove('number-bounce');
        }, 600);

        // 增加难度
        increaseDifficulty();

        // 显示升级效果
        showGameNotification(`升级到第${gameState.level}关！`, 'bonus');

        // 更新UI
        updateGameUI();
        
        // 添加关卡数字弹跳动画
        const levelElement = elements.game.level;
        levelElement.classList.add('number-bounce');
        
        // 动画结束后移除类
        setTimeout(() => {
            levelElement.classList.remove('number-bounce');
        }, 600);
    }
}

// 增加游戏难度
function increaseDifficulty() {
    const dynamicSettings = gameState.dynamicDifficulty;

    // 根据当前关卡增加难度
    switch (gameState.level) {
        case 2:
            // 第2关：增加所有颜色，6个选项
            dynamicSettings.currentColors = ['red', 'yellow', 'blue', 'green'];
            dynamicSettings.currentTexts = ['红', '黄', '蓝', '绿'];
            dynamicSettings.optionsCount = 6;
            dynamicSettings.nextLevelThreshold = 150;
            break;
        case 3:
            // 第3关：9个选项
            dynamicSettings.currentColors = ['red', 'yellow', 'blue', 'green', 'purple', 'pink'];
            dynamicSettings.currentTexts = ['红', '黄', '蓝', '绿', '紫', '粉'];
            dynamicSettings.optionsCount = 9;
            dynamicSettings.nextLevelThreshold = 240;
            break;
        default:
            // 已经是最高关卡，只增加分数阈值
            dynamicSettings.nextLevelThreshold += 100;
            break;
    }
}

// 更新游戏UI
function updateGameUI() {
    elements.game.score.textContent = gameState.score;
    elements.game.time.textContent = Math.max(0, Math.floor(gameState.time * 10) / 10).toFixed(1);
    elements.game.level.textContent = gameState.level;

    // 更新连击指示器
    updateComboIndicator();
    
    // 更新宠物数量
    petManager.updatePets();
}

// 更新连击指示器
function updateComboIndicator() {
    // 更新连击数字
    elements.game.comboNumber.textContent = gameState.combo;

    // 显示/隐藏连击指示器
    if (gameState.combo > 0) {
        elements.game.comboIndicator.classList.add('active');
    } else {
        elements.game.comboIndicator.classList.remove('active');
        elements.game.comboIndicator.classList.remove('milestone');
    }

    // 检查是否达到连击里程碑
    const comboMilestones = Object.keys(gameConfig.comboRewards).map(Number);
    const isAtMilestone = comboMilestones.some(milestone =>
        gameState.combo > 0 && gameState.combo % milestone === 0
    );

    if (isAtMilestone) {
        elements.game.comboIndicator.classList.add('milestone');
    } else {
        elements.game.comboIndicator.classList.remove('milestone');
    }
}

// 结束游戏
function endGame() {
    // 检查是否已经弹出过广告机会，防止多次弹窗
    if (gameState._adModalShown) {
        // 如果已经看过一次广告，直接结束
        actuallyEndGame();
        return;
    }
    // 弹出广告选择弹窗
    showAdModal();
}

// 真正的结束流程，原endGame内容迁移到这里
function actuallyEndGame() {
    // 停止计时器
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }

    // 停止背景音乐
    stopBackgroundMusic();

    // 播放游戏结束音效
    elements.sounds.win.play();

    // 检查成就
    checkAchievements();

    // 保存游戏数据
    saveGameData();

    // 更新结果界面
    updateResultScreen();

    // 显示结果界面
    showScreen('result');
}

// 弹出广告选择弹窗
function showAdModal() {
    const adModal = document.getElementById('ad-modal');
    const watchAdBtn = document.getElementById('watch-ad-btn');
    const giveUpBtn = document.getElementById('give-up-btn');
    const adVideo = document.getElementById('ad-video');

    // 新增：尝试用webp动图替换mp4
    if (adVideo) {
        // 清空原有内容
        adVideo.innerHTML = '';
        const webpImg = document.createElement('img');
        webpImg.src = 'advertisement/advertisement.webp';
        webpImg.alt = '广告';
        webpImg.style.maxWidth = '100%';
        webpImg.style.maxHeight = '50vh';
        webpImg.style.display = 'none';
        adVideo.appendChild(webpImg);
    }

    if (!adModal || !watchAdBtn || !giveUpBtn || !adVideo) {
        // 兜底，直接结束
        actuallyEndGame();
        return;
    }

    // 标记已弹出，防止多次弹窗
    gameState._adModalShown = true;

    // 显示弹窗
    adModal.style.display = 'flex';
    if (adVideo) adVideo.style.display = 'none';
    if (adVideo && adVideo.firstChild) adVideo.firstChild.style.display = 'none';
    watchAdBtn.style.display = '';
    giveUpBtn.style.display = '';

    // 解绑旧事件，防止多次绑定
    watchAdBtn.onclick = null;
    giveUpBtn.onclick = null;
    if (adVideo) adVideo.onended = null;

    // 观看广告按钮
    watchAdBtn.onclick = function() {
        watchAdBtn.disabled = true;
        giveUpBtn.disabled = true;
        if (adVideo && adVideo.firstChild) {
            // 动态计算宽高，适配移动端
            const modalContent = adModal.querySelector('.ad-modal-content');
            const maxW = Math.min(window.innerWidth * 0.9, 400);
            const maxH = Math.min(window.innerHeight * 0.5, 225);
            adVideo.style.maxWidth = maxW + 'px';
            adVideo.style.maxHeight = maxH + 'px';
            adVideo.style.width = '100%';
            adVideo.style.height = 'auto';
            if (modalContent) {
                modalContent.style.maxWidth = maxW + 'px';
                modalContent.style.maxHeight = (maxH + 80) + 'px';
            }
            adVideo.style.display = 'block';
            adVideo.firstChild.style.display = 'block';
        }
        watchAdBtn.style.display = 'none';
        giveUpBtn.style.display = 'none';
        // 隐藏标题和提示
        const adTitle = adModal.querySelector('h3');
        const adTip = adModal.querySelector('p');
        if (adTitle) adTitle.style.display = 'none';
        if (adTip) adTip.style.display = 'none';
        // webp动图5秒后关闭
        setTimeout(() => {
            adModal.style.display = 'none';
            // 奖励10秒
            gameState.time = Math.max(10, gameState.time + 10);
            updateGameUI();
            // 重新开始计时
            startTimer();
            // 恢复按钮
            watchAdBtn.disabled = false;
            giveUpBtn.disabled = false;
            watchAdBtn.style.display = '';
            // 恢复标题和提示
            if (adTitle) adTitle.style.display = '';
            if (adTip) adTip.style.display = '';
        }, 5000);
    };
    // 放弃按钮
    giveUpBtn.onclick = function() {
        adModal.style.display = 'none';
        actuallyEndGame();
    };
}

// 检查成就
function checkAchievements() {
    const player = {
        maxCombo: gameState.maxCombo,
        clearedLevels: gameState.clearedLevels,
        totalTime: gameState.totalTime,
        consecutiveErrors: gameState.consecutiveErrors
    };

    gameConfig.achievements.forEach(achievement => {
        if (!gameState.unlockedAchievements.includes(achievement.id) && achievement.condition(player)) {
            gameState.unlockedAchievements.push(achievement.id);
            showUnlockNotification(`解锁成就：${achievement.name}！`);
        }
    });
}

// 显示解锁通知
function showUnlockNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = 'unlocked-item';

    elements.result.unlockedContainer.appendChild(notification);
}

// 更新结果界面
function updateResultScreen() {
    // 更新结果数据
    elements.result.finalScore.textContent = gameState.score;
    elements.result.maxCombo.textContent = gameState.maxCombo;
    elements.result.clearedLevels.textContent = gameState.clearedLevels;
    
    // 清空解锁内容容器，避免重复添加
    elements.result.unlockedContainer.innerHTML = '';

    // 计算并显示正确率
    const accuracy = gameState.totalClicks > 0
        ? Math.round((gameState.correctClicks / gameState.totalClicks) * 100)
        : 0;
    elements.result.accuracy.textContent = `${accuracy}%`;

    // 计算并显示最快反应时间
    let fastestTime = gameState.clickTimes.length > 0
        ? Math.min(...gameState.clickTimes).toFixed(2)
        : "0.00";
    elements.result.fastestTime.textContent = fastestTime;

    // 计算并显示平均反应时间
    let averageTime = "0.00";
    if (gameState.clickTimes.length > 0) {
        const sum = gameState.clickTimes.reduce((a, b) => a + b, 0);
        averageTime = (sum / gameState.clickTimes.length).toFixed(2);
    }
    elements.result.averageTime.textContent = averageTime;

    // 如果曾经使用过调试模式，显示提示信息
    if (gameState.hasUsedDebugMode) {
        const debugWarning = document.createElement('div');
        debugWarning.className = 'debug-warning';
        debugWarning.textContent = '⚠️ 该玩家曾使用过调试模式，成绩可能不真实';
        elements.result.unlockedContainer.appendChild(debugWarning);
    }

    // 获取结果按钮容器
    const resultButtons = document.querySelector('.result-buttons');

    // 先隐藏按钮
    resultButtons.classList.remove('show');

    // 1秒后显示按钮
    setTimeout(() => {
        resultButtons.classList.add('show');
    }, 1000);

    // 分数达到400分时显示进阶玩法按钮
    const advBtn = document.getElementById('start-advanced');
    if (advBtn) {
        if (gameState.score === 30) {
        // if (gameState.score >= 400) {
            // 只在第一次达到400分且按钮未显示过时弹窗
            if (!gameState.advancedUnlockModalShown) {
                showAdvancedUnlockModal();
                gameState.advancedUnlockModalShown = true;
                window.advancedUnlockModalShown = true;
                saveGameData();
            }
            advBtn.style.display = '';
        }
    }
}

function showAdvancedUnlockModal() {
    // 检查是否已存在，避免重复
    let modal = document.getElementById('advanced-unlock-modal');
    if (modal) {
        modal.style.display = 'flex';
        return;
    }
    // 创建弹窗结构
    modal = document.createElement('div');
    modal.id = 'advanced-unlock-modal';
    modal.className = 'ad-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="ad-modal-content">
        <h3>勇士，恭喜你被国王看中！</h3>
        <p>特邀来解决老国王留下的谜题，<br>地位、金钱，任你挑选！</p>
        <div class="ad-modal-buttons">
          <button id="advanced-unlock-close-btn" class="btn btn-primary">关闭</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    // 按钮事件
    document.getElementById('advanced-unlock-close-btn').onclick = function() {
        modal.style.display = 'none';
    };
    // 新增：弹窗出现时也同步状态
    gameState.advancedUnlockModalShown = true;
    window.advancedUnlockModalShown = true;
    saveGameData();
}

// 渲染成就列表
function renderAchievements() {
    const achievementsContainer = document.querySelector('.achievements-list');
    achievementsContainer.innerHTML = '';

    gameConfig.achievements.forEach(achievement => {
        const isUnlocked = gameState.unlockedAchievements.includes(achievement.id);

        const achievementElement = document.createElement('div');
        achievementElement.className = `achievement-item ${isUnlocked ? '' : 'achievement-locked'}`;

        achievementElement.innerHTML = `
            <div class="achievement-icon">🏆</div>
            <h3>${achievement.name}</h3>
            <p>${achievement.description}</p>
            ${isUnlocked ? '<div class="achievement-unlocked-tag">已解锁</div>' : '<div class="achievement-locked-tag">未解锁</div>'}
        `;

        achievementsContainer.appendChild(achievementElement);
    });
}

// 分享结果
function shareResult() {
    // 计算正确率和平均反应时间
    const accuracy = gameState.totalClicks > 0
        ? Math.round((gameState.correctClicks / gameState.totalClicks) * 100)
        : 0;

    let averageTime = "0.00";
    if (gameState.clickTimes.length > 0) {
        const sum = gameState.clickTimes.reduce((a, b) => a + b, 0);
        averageTime = (sum / gameState.clickTimes.length).toFixed(2);
    }

    // 创建分享文本
    let shareText = `我在《头文字R》中获得了${gameState.score}分，最高连击${gameState.maxCombo}次，通过了${gameState.clearedLevels}关！正确率${accuracy}%，平均反应时间${averageTime}秒。`;
    
    // 如果使用过调试模式，添加标记
    if (gameState.hasUsedDebugMode) {
        shareText += "（使用过调试模式）";
    }
    
    shareText += "来挑战我吧！";

    // 尝试使用Web Share API
    if (navigator.share) {
        navigator.share({
            title: '头文字R',
            text: shareText,
            url: window.location.href
        }).catch(err => {
            console.error('分享失败:', err);
            alert(shareText);
        });
    } else {
        // 回退方案：复制到剪贴板
        navigator.clipboard.writeText(shareText).then(() => {
            alert('分享文本已复制到剪贴板！');
        }).catch(() => {
            alert(shareText);
        });
    }
}

//阻止safari浏览器双击放大功能
let lastTouchEnd = 0  //更新手指弹起的时间
document.documentElement.addEventListener("touchstart", function (event) {
    //多根手指同时按下屏幕，禁止默认行为
    if (event.touches.length > 1) {
        event.preventDefault();
    }
});
document.documentElement.addEventListener("touchend", function (event) {
    let now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        //当两次手指弹起的时间小于300毫秒，认为双击屏幕行为
        event.preventDefault();
    }else{ // 否则重新手指弹起的时间
        lastTouchEnd = now;
    }
}, false);
//阻止双指放大页面
document.documentElement.addEventListener("gesturestart", function (event) {
    event.preventDefault();
});
// 初始化游戏
document.addEventListener('DOMContentLoaded', function() {
    // 设置随机背景
    setRandomBackground();
    
    // 初始化游戏
    initGame();
    setupAdvancedMode();
});
// 根据选项数量调整容器的列数
function adjustOptionsContainerColumns(optionsCount) {
    const container = elements.game.optionsContainer;
    const isMobile = window.innerWidth <= 500;

    // 根据选项数量设置合适的列数
    let columns;
    switch (optionsCount) {
        case 4:
            columns = 2; // 始终使用2x2布局
            break;
        case 6:
            columns = isMobile ? 2 : 3; // 移动端2x3布局，桌面端3x2布局
            break;
        case 9:
            columns = 3; // 3x3布局
            break;
        default:
            columns = Math.ceil(Math.sqrt(optionsCount)); // 默认尽量接近正方形布局
    }

    // 设置列数和列宽
    const columnWidth = isMobile ? 70 : 80;
    container.style.gridTemplateColumns = `repeat(${columns}, ${columnWidth}px)`;
}

// 显示得分特效
function showScoreEffect(button, score) {
    // 创建得分特效元素
    const scoreEffect = document.createElement('div');
    scoreEffect.className = 'score-effect';

    // 如果是错误特效，添加wrong类
    if (score === '❌') {
        scoreEffect.classList.add('wrong');
    }

    scoreEffect.textContent = score;

    // 计算初始位置（按钮中心）
    const buttonRect = button.getBoundingClientRect();
    const gameRect = elements.screens.game.getBoundingClientRect();

    // 设置初始位置（相对于游戏容器）
    const left = buttonRect.left - gameRect.left + buttonRect.width / 2;
    const top = buttonRect.top - gameRect.top + buttonRect.height / 2;

    scoreEffect.style.left = `${left}px`;
    scoreEffect.style.top = `${top}px`;

    // 物理参数
    const physics = {
        x: 0,
        y: 0,
        vx: (Math.random() - 0.5) * 10, // 随机水平速度
        vy: -Math.random() * 15 - 5,   // 随机向上的初始速度
        gravity: score === '✘' ? 0.8 : 0.5,                   // 重力加速度
        friction: 0.99                  // 摩擦力
    };

    // 添加到游戏容器
    elements.screens.game.appendChild(scoreEffect);
    scoreEffect.style.transform = 'translate(0, 0)';

    // 使用requestAnimationFrame实现平滑动画
    let opacity = 1;
    let animationId;

    function animate() {
        // 更新速度和位置
        physics.vy += physics.gravity;  // 应用重力
        physics.vx *= physics.friction; // 应用摩擦力
        physics.x += physics.vx;
        physics.y += physics.vy;

        // 更新元素位置
        scoreEffect.style.transform = `translate(${physics.x}px, ${physics.y}px)`;

        // 逐渐降低透明度
        opacity -= 0.01;
        if (opacity > 0) {
            scoreEffect.style.opacity = opacity;
        }

        // 检查是否已经离开屏幕或完全透明
        if (opacity > 0 &&
            top + physics.y < gameRect.height + 100 &&
            left + physics.x > -100 &&
            left + physics.x < gameRect.width + 100) {
            animationId = requestAnimationFrame(animate);
        } else {
            scoreEffect.remove();
            cancelAnimationFrame(animationId);
        }
    }

    // 开始动画
    animationId = requestAnimationFrame(animate);
}
// 播放主菜单音乐
function playHomeMusic() {
    // 如果主菜单音乐已经在播放，则不需要重新开始
    if (!elements.sounds.home.paused) {
        return;
    }

    // 停止游戏背景音乐（如果正在播放）
    elements.sounds.bgm.pause();
    elements.sounds.bgm.currentTime = 0;

    // 重置主菜单音乐到开头
    elements.sounds.home.currentTime = 0;
    // 设置音量
    elements.sounds.home.volume = 0.4;
    // 设置循环播放
    elements.sounds.home.loop = true;
    // 播放音乐
    elements.sounds.home.play().catch(error => {
        console.log('主菜单音乐播放失败，等待用户交互后再播放:', error);
    });
}
// 播放连击欢呼音效
function playComboYaySound(comboCount) {
    // 连击数小于2时不播放
    if (comboCount < 2) return;

    // 连击数为5时播放特殊音效
    if (comboCount === 5) {
        elements.sounds.yay4.currentTime = 0;
        elements.sounds.yay4.play();
        return;
    }

    // 其他连击数随机播放普通欢呼音效
    if (comboCount == 2 || Math.random() < 0.5) {
        const randomYay = Math.floor(Math.random() * 3) + 1; // 1-3之间的随机数
        const yaySound = elements.sounds[`yay${randomYay}`];

        if (yaySound) {
            yaySound.currentTime = 0;
            yaySound.play();
        }
    }
}
// 此函数已被showGameNotification替代，保留此注释以便于代码追踪


// 切换遮盖目标
function switchCoverTargets(count) {
    // 移除所有旧遮盖
    document.querySelectorAll('.cover-flip-effect').forEach(e => e.remove());
    document.querySelectorAll('.option-btn.covered').forEach(e => e.classList.remove('covered'));
    const buttons = Array.from(document.querySelectorAll('.option-btn'));
    if (buttons.length === 0) return;
    // 不允许重复遮盖同一个按钮
    const shuffled = buttons.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        const btn = shuffled[i];
        const cover = document.createElement('div');
        cover.className = 'cover-flip-effect';
        cover.innerHTML = '?';
        cover.style.position = 'absolute';
        cover.style.left = 0;
        cover.style.top = 0;
        cover.style.width = '100%';
        cover.style.height = '100%';
        cover.style.display = 'flex';
        cover.style.alignItems = 'center';
        cover.style.justifyContent = 'center';
        cover.style.fontSize = '2em';
        cover.style.background = '#000';
        cover.style.color = '#fff';
        cover.style.borderRadius = '8px';
        cover.style.pointerEvents = 'none';
        cover.style.zIndex = 999;
        btn.style.position = 'relative';
        btn.classList.add('covered');
        btn.appendChild(cover);
    }
}
// 调整选项按钮文字大小
function adjustOptionButtonTextSize() {
    const optionButtons = document.querySelectorAll('.option-btn');
    if (!optionButtons.length) return;
    
    optionButtons.forEach(button => {
        // 获取按钮的宽度
        const buttonWidth = button.offsetWidth;
        
        // 根据按钮宽度计算合适的字体大小
        // 文字大小约为按钮宽度的80%（原来的两倍）
        const fontSize = Math.max(Math.min(buttonWidth * 0.8, 64), 32);
        
        // 设置字体大小
        button.style.fontSize = `${fontSize}px`;
        
        // 调整文字行高，确保垂直居中
        button.style.lineHeight = '1.1';
    });
}
// 猫狗宠物管理
const petManager = {
    pets: [],
    container: null,
    maxPets: 30,
    
    // 初始化宠物容器
    init() {
        // 创建宠物容器
        this.container = document.createElement('div');
        this.container.className = 'pet-container';
        elements.screens.game.appendChild(this.container);
    },
    
    // 更新宠物数量与连击数一致
    updatePets() {
        const currentCombo = gameState.combo;
        
        // 限制最大数量
        const targetCount = Math.min(currentCombo, this.maxPets);
        
        // 如果连击为0，移除所有宠物
        if (currentCombo === 0) {
            this.removeAllPets();
            return;
        }
        
        // 如果需要添加宠物
        if (this.pets.length < targetCount) {
            const petsToAdd = targetCount - this.pets.length;
            for (let i = 0; i < petsToAdd; i++) {
                this.addPet();
            }
        }
        // 如果需要移除宠物
        else if (this.pets.length > targetCount) {
            const petsToRemove = this.pets.length - targetCount;
            for (let i = 0; i < petsToRemove; i++) {
                this.removePet();
            }
        }
    },
    
    // 添加一个宠物
    addPet() {
        // 创建宠物元素
        const pet = document.createElement('div');
        pet.className = 'pet appearing';
        
        // 随机选择宠物类型（猫、狗、猫翻转、狗翻转）
        const petType = Math.floor(Math.random() * 4);
        switch (petType) {
            case 0:
                pet.classList.add('cat');
                break;
            case 1:
                pet.classList.add('dog');
                break;
            case 2:
                pet.classList.add('cat-flipped');
                break;
            case 3:
                pet.classList.add('dog-flipped');
                break;
        }
        
        // 随机位置（在游戏区域底部10%范围内）
        const gameRect = elements.screens.game.getBoundingClientRect();
        const bottomArea = gameRect.height * 0.1;
        const randomX = Math.random() * gameRect.width;
        const randomY = gameRect.height - Math.random() * bottomArea;
        
        pet.style.left = `${randomX}px`;
        pet.style.bottom = `${gameRect.height - randomY}px`;
        
        // 添加到容器
        this.container.appendChild(pet);
        
        // 添加到宠物数组
        this.pets.push(pet);
        
        // 动画结束后添加晃动效果
        pet.addEventListener('animationend', (e) => {
            if (e.animationName === 'petAppear') {
                pet.classList.remove('appearing');
                // 随机选择晃动动画
                const swayClass = Math.random() < 0.5 ? 'sway1' : 'sway2';
                pet.classList.add(swayClass);
            } else if (e.animationName === 'petDisappear') {
                pet.remove();
            }
        });
    },
    
    // 移除一个宠物（最后添加的）
    removePet() {
        if (this.pets.length === 0) return;
        
        // 获取最后一个宠物
        const pet = this.pets.pop();
        
        // 添加消失动画
        pet.classList.remove('sway1', 'sway2');
        pet.classList.add('disappearing');
    },
    
    // 移除所有宠物
    removeAllPets() {
        // 为所有宠物添加消失动画
        this.pets.forEach(pet => {
            setTimeout(() => {
                pet.classList.remove('sway1', 'sway2');
                pet.classList.add('disappearing');
            }, Math.random() * 500);
        });
        
        // 清空宠物数组
        this.pets = [];
    }
};

// 随机选择背景图片
function setRandomBackground() {
    const backgrounds = [
        'images/background-min.png',
        'images/background2-min.png',
        'images/background3-min.png',
        'images/background4-min.png',
        'images/background5-min.png'
    ];
    // 随机选择一个背景
    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    const selectedBackground = backgrounds[randomIndex];
    // 只预加载选中的背景
    const img = new Image();
    img.src = selectedBackground;
    // 应用到游戏容器
    const gameContainer = document.querySelector('.game-container');
    gameContainer.style.backgroundImage = `url('${selectedBackground}')`;
}

// 进阶玩法相关
function setupAdvancedMode() {
    const startAdvancedBtn = document.getElementById('start-advanced');
    const advancedScreen = document.getElementById('advanced-screen');
    const backFromAdvanced = document.getElementById('back-from-advanced');
    if (!startAdvancedBtn || !advancedScreen || !backFromAdvanced) return;
    startAdvancedBtn.addEventListener('click', () => {
        showScreen('advanced');
        startAdvancedGame();
    });
    backFromAdvanced.addEventListener('click', () => {
        showScreen('mainMenu');
    });
    if (window.advancedUnlockModalShown) {
        startAdvancedBtn.style.display = '';
    }
}

// 进阶玩法核心逻辑
const advancedConfig = {
    rows: 3,
    cols: 3,
    stackCount: 10,
    textMap: gameConfig.textMap
};

let _advancedGuideShown = false;

function showAdvancedGuideModal() {
    let modal = document.getElementById('advanced-guide-modal');
    if (modal) {
        modal.style.display = 'flex';
        return;
    }
    modal = document.createElement('div');
    modal.id = 'advanced-guide-modal';
    modal.className = 'ad-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="ad-modal-content">
        <h3>老国王的灵魂：</h3>
        <p>拖一拖里面的牌，<br>你会发现其中的奥妙。<br>勇士，祝你好运！哈哈哈哈！</p>
        <div class="ad-modal-buttons">
          <button id="advanced-guide-close-btn" class="btn btn-primary">我知道了</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('advanced-guide-close-btn').onclick = function() {
        modal.style.display = 'none';
    };
}

// 新增：记录禁用格子
let _advancedDisabledCells = [];

function getRandomCell(rows, cols, excludeCells = []) {
    let candidates = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!excludeCells.some(cell => cell[0] === r && cell[1] === c)) {
                candidates.push([r, c]);
            }
        }
    }
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
}

function startAdvancedGame() {
    if (!_advancedGuideShown) {
        showAdvancedGuideModal();
        _advancedGuideShown = true;
    }
    const board = document.querySelector('.advanced-board');
    if (!board) return;
    board.innerHTML = '';
    // 生成成对的牌，保证有解
    const total = advancedConfig.rows * advancedConfig.cols * advancedConfig.stackCount;
    if (total % 2 !== 0) {
        alert('总牌数必须为偶数才能保证有解');
        return;
    }
    const texts = Object.keys(advancedConfig.textMap);
    const colors = Object.values(advancedConfig.textMap);
    const pairs = [];
    while (pairs.length < total / 2) {
        const text = texts[Math.floor(Math.random() * texts.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        pairs.push({ text, color });
    }
    let allCards = [];
    pairs.forEach(pair => {
        allCards.push({ ...pair });
        allCards.push({ ...pair });
    });
    // 打乱所有牌
    for (let i = allCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }
    // 统计所有可用格子
    const availableCells = [];
    for (let r = 0; r < advancedConfig.rows; r++) {
        for (let c = 0; c < advancedConfig.cols; c++) {
            if (!_advancedDisabledCells.some(cell => cell[0] === r && cell[1] === c)) {
                availableCells.push([r, c]);
            }
        }
    }
    // 打乱可用格子顺序
    for (let i = availableCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableCells[i], availableCells[j]] = [availableCells[j], availableCells[i]];
    }
    // 初始化grid
    const grid = [];
    for (let r = 0; r < advancedConfig.rows; r++) {
        const row = [];
        for (let c = 0; c < advancedConfig.cols; c++) {
            let isDisabled = _advancedDisabledCells.some(cell => cell[0] === r && cell[1] === c);
            row.push(isDisabled ? null : []);
        }
        grid.push(row);
    }
    // 尽量平均分配所有牌到可用格子
    const base = Math.floor(allCards.length / availableCells.length);
    const extra = allCards.length % availableCells.length;
    let idx = 0;
    for (let i = 0; i < availableCells.length; i++) {
        const [r, c] = availableCells[i];
        const count = base + (i < extra ? 1 : 0);
        for (let j = 0; j < count; j++) {
            grid[r][c].push(allCards[idx++]);
        }
    }
    window._advancedGrid = grid;
    renderAdvancedBoardV2();
}

function renderAdvancedBoardV2() {
    const board = document.querySelector('.advanced-board');
    const grid = window._advancedGrid;
    board.innerHTML = '';
    board.style.display = 'grid';
    board.style.gridTemplateRows = `repeat(${advancedConfig.rows}, 1fr)`;
    board.style.gridTemplateColumns = `repeat(${advancedConfig.cols}, 1fr)`;
    board.style.gap = '16px';
    for (let r = 0; r < advancedConfig.rows; r++) {
        for (let c = 0; c < advancedConfig.cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'advanced-cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            // 禁用格子
            if (_advancedDisabledCells.some(cellPos => cellPos[0] === r && cellPos[1] === c)) {
                cell.classList.add('advanced-cell-disabled');
                cell.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#bbb;">X</div>';
                board.appendChild(cell);
                continue;
            }
            // 新增：整个格子都可拖拽放置
            cell.ondragover = (e) => {
                e.preventDefault();
            };
            cell.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation(); // 防止冒泡到全局drop
                const from = e.dataTransfer.getData('text/plain');
                const [fromR, fromC] = from.split(',').map(Number);
                if ((fromR === r && fromC === c)) return;
                const grid = window._advancedGrid;
                if (!grid[fromR][fromC].length) return;
                const fromCard = grid[fromR][fromC][grid[fromR][fromC].length - 1];
                if (!grid[r][c] || grid[r][c].length === 0) {
                    // 空栈，直接放置
                    grid[r][c].push(fromCard);
                    grid[fromR][fromC].pop();
                } else {
                    const toCard = grid[r][c][grid[r][c].length - 1];
                    if (fromCard.text === toCard.text && fromCard.color === toCard.color) {
                        // 两个都弹栈
                        grid[fromR][fromC].pop();
                        grid[r][c].pop();
                        // 播放随机yay音效
                        // const yayIdx = Math.floor(Math.random() * 3) + 1;
                        // const yaySound = elements.sounds[`yay${yayIdx}`];
                        // if (yaySound) {
                        //     yaySound.currentTime = 0;
                        //     yaySound.play();
                        // }
                        elements.sounds.wrong.currentTime = 0;
                        elements.sounds.wrong.play();
                    } else if (fromCard.text === toCard.text && fromCard.color !== toCard.color) {
                        // 字相同颜色不同，from弹栈，to压入from
                        grid[fromR][fromC].pop();
                        grid[r][c].push(fromCard);
                    } else {
                        // 反弹动画
                        const topDiv = cell.querySelector('.advanced-flipped-card');
                        if (topDiv) {
                            topDiv.classList.add('shake');
                            setTimeout(() => topDiv.classList.remove('shake'), 500);
                        }
                        return;
                    }
                }
                renderAdvancedBoardV2();
                checkAdvancedWinV2();
            };
            const stackDiv = document.createElement('div');
            stackDiv.className = 'advanced-stack';
            // 牌数
            const countDiv = document.createElement('div');
            countDiv.className = 'advanced-stack-count';
            countDiv.textContent = grid[r][c] ? `剩${grid[r][c].length}张` : '';
            stackDiv.appendChild(countDiv);
            if (grid[r][c] && grid[r][c].length > 0) {
                const top = grid[r][c][grid[r][c].length - 1];
                const flippedDiv = document.createElement('div');
                flippedDiv.className = 'advanced-flipped-card';
                flippedDiv.textContent = top.text;
                flippedDiv.style.color = top.color;
                flippedDiv.style.fontSize = '2rem';
                flippedDiv.style.justifyContent = 'center';
                flippedDiv.style.alignItems = 'center';
                flippedDiv.setAttribute('draggable', 'true');
                flippedDiv.ondragstart = (e) => {
                    e.dataTransfer.setData('text/plain', `${r},${c}`);
                };
                stackDiv.appendChild(flippedDiv);
            } else if (grid[r][c]) {
                // 栈整体为空，显示可放置虚拟牌位
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'advanced-empty-slot';
                emptyDiv.textContent = '';
                emptyDiv.ondragover = (e) => { e.preventDefault(); };
                emptyDiv.ondrop = (e) => {
                    e.preventDefault();
                    e.stopPropagation(); // 防止冒泡到全局drop
                    const from = e.dataTransfer.getData('text/plain');
                    const [fromR, fromC] = from.split(',').map(Number);
                    if ((fromR === r && fromC === c)) return;
                    const grid = window._advancedGrid;
                    if (!grid[fromR][fromC].length) return;
                    const fromCard = grid[fromR][fromC][grid[fromR][fromC].length - 1];
                    if (grid[r][c].length === 0) {
                        grid[r][c].push(fromCard);
                        grid[fromR][fromC].pop();
                        renderAdvancedBoardV2();
                        checkAdvancedWinV2();
                    }
                };
                stackDiv.appendChild(emptyDiv);
            }
            cell.appendChild(stackDiv);
            board.appendChild(cell);
        }
    }
}

function flipAdvancedCardV2(r, c) {
    const grid = window._advancedGrid;
    if (!grid || !grid[r][c] || grid[r][c].length !== 0) return;
    // 新牌
    const texts = Object.keys(advancedConfig.textMap);
    const text = texts[Math.floor(Math.random() * texts.length)];
    let color;
    do {
        color = Object.values(advancedConfig.textMap)[Math.floor(Math.random() * texts.length)];
    } while (color === advancedConfig.textMap[text] && texts.length > 1 && Math.random() < 0.5);
    grid[r][c].push({ text, color });
    renderAdvancedBoardV2();
}

document.addEventListener('dragover', function(e) {
    if (e.target.classList.contains('advanced-flipped-card') && e.target.getAttribute('draggable') === 'true') {
        e.preventDefault();
    }
});
document.addEventListener('drop', function(e) {
    const target = e.target;
    if (target.classList.contains('advanced-flipped-card') && target.getAttribute('draggable') === 'true') {
        e.preventDefault();
        const toR = parseInt(target.parentElement.parentElement.dataset.row);
        const toC = parseInt(target.parentElement.parentElement.dataset.col);
        const from = e.dataTransfer.getData('text/plain');
        const [fromR, fromC] = from.split(',').map(Number);
        if ((fromR === toR && fromC === toC)) return;
        const grid = window._advancedGrid;
        if (!grid[fromR][fromC].length) return;
        const fromCard = grid[fromR][fromC][grid[fromR][fromC].length - 1];
        // 判断目标栈整体是否为空（即数组长度为0）
        if (grid[toR][toC].length === 0) {
            // 整个栈为空，可以放入任意牌
            grid[toR][toC].push(fromCard);
            grid[fromR][fromC].pop();
        } else {
            const toCard = grid[toR][toC][grid[toR][toC].length - 1];
            if (fromCard.text === toCard.text && fromCard.color === toCard.color) {
                // 两个都弹栈
                grid[fromR][fromC].pop();
                grid[toR][toC].pop();
                // 播放随机yay音效
                const randomYay = Math.floor(Math.random() * 3) + 1; // 1-3之间的随机数
                const yaySound = elements.sounds[`yay${randomYay}`];

                if (yaySound) {
                    yaySound.currentTime = 0;
                    yaySound.play();
                }
            } else if (fromCard.text === toCard.text && fromCard.color !== toCard.color) {
                // 字相同颜色不同，from弹栈，to压入from
                grid[fromR][fromC].pop();
                grid[toR][toC].push(fromCard);
            } else {
                // 反弹动画
                target.classList.add('shake');
                setTimeout(() => target.classList.remove('shake'), 500);
                return;
            }
        }
        renderAdvancedBoardV2();
        checkAdvancedWinV2();
    }
});

function checkAdvancedWinV2() {
    const grid = window._advancedGrid;
    let allCleared = true;
    for (let r = 0; r < advancedConfig.rows; r++) {
        for (let c = 0; c < advancedConfig.cols; c++) {
            if (_advancedDisabledCells.some(cellPos => cellPos[0] === r && cellPos[1] === c)) {
                continue;
            }
            if (grid[r][c].length > 0) {
                allCleared = false;
            }
        }
    }
    if (allCleared) {
        setTimeout(() => {
            showAdvancedSuccessModal();
        }, 300);
    }
}

function showAdvancedSuccessModal() {
    // 检查是否已存在，避免重复
    let modal = document.getElementById('advanced-success-modal');
    // 判断是否已禁用2个格子
    disabledCount = _advancedDisabledCells.length;
    isFinal = disabledCount >= 2;
    if (isFinal) {
        elements.sounds.yay4.play();
    } else {
        elements.sounds.nioce.play();
    }
    if (modal) {
        modal.style.display = 'flex';
        modal.innerHTML = isFinal ? `
        <div class="ad-modal-content">
            <h3>恭喜你，勇士！</h3>
            <p>你已完成了国王的谜题！</p>
            <div class="ad-modal-buttons">
            <button id="advanced-success-back-btn" class="btn btn-primary">返回主菜单</button>
            </div>
        </div>
        ` : `
        <div class="ad-modal-content">
            <h3>勇士！干的漂亮！</h3>
            <div class="ad-modal-buttons">
                <button id="advanced-success-back-btn" class="btn btn-primary">返回主菜单</button>
                <button id="advanced-success-next-btn" class="btn btn-primary">下一关</button>
            </div>
        </div>
        `;
        // 重新绑定按钮事件
        document.getElementById('advanced-success-back-btn').onclick = function() {
            modal.style.display = 'none';
            if (!isFinal) {
                const nextDisable = getRandomCell(advancedConfig.rows, advancedConfig.cols, _advancedDisabledCells);
                if (nextDisable) _advancedDisabledCells.push(nextDisable);
            } else {
                _advancedDisabledCells = [];
            }
            showScreen('mainMenu');
        };
        if (!isFinal) {
            document.getElementById('advanced-success-next-btn').onclick = function() {
                modal.style.display = 'none';
                const nextDisable = getRandomCell(advancedConfig.rows, advancedConfig.cols, _advancedDisabledCells);
                if (nextDisable) _advancedDisabledCells.push(nextDisable);
                startAdvancedGame();
            };
        }
        return;
    }
    // 创建弹窗结构
    modal = document.createElement('div');
    modal.id = 'advanced-success-modal';
    modal.className = 'ad-modal';
    modal.style.display = 'flex';
    modal.innerHTML = isFinal ? `
    <div class="ad-modal-content">
        <h3>恭喜你，勇士！</h3>
        <p>你已完成了国王的谜题！</p>
        <div class="ad-modal-buttons">
        <button id="advanced-success-back-btn" class="btn btn-primary">返回主菜单</button>
        </div>
    </div>
    ` : `
    <div class="ad-modal-content">
        <h3>勇士！干的漂亮！</h3>
        <div class="ad-modal-buttons">
            <button id="advanced-success-back-btn" class="btn btn-primary">返回主菜单</button>
            <button id="advanced-success-next-btn" class="btn btn-primary">下一关</button>
        </div>
    </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('advanced-success-back-btn').onclick = function() {
        modal.style.display = 'none';
        if (!isFinal) {
            // 禁用一个新的随机格子
            const nextDisable = getRandomCell(advancedConfig.rows, advancedConfig.cols, _advancedDisabledCells);
            if (nextDisable) _advancedDisabledCells.push(nextDisable);
        } else {
            _advancedDisabledCells = [];
        }
        showScreen('mainMenu');
    };
    if (!isFinal) {
        document.getElementById('advanced-success-next-btn').onclick = function() {
            modal.style.display = 'none';
            // 禁用一个新的随机格子
            const nextDisable = getRandomCell(advancedConfig.rows, advancedConfig.cols, _advancedDisabledCells);
            if (nextDisable) _advancedDisabledCells.push(nextDisable);
            startAdvancedGame();
        };
    }
}
// 导出函数供其他模块使用
