
        // DOM 로드 후 이벤트 리스너 등록
        document.addEventListener('DOMContentLoaded', function() {
            var loginBtn = document.getElementById('loginBtn');
            var loginInput = document.getElementById('loginPasswordInput');
            if (loginBtn) loginBtn.addEventListener('click', function() { login(); });
            if (loginInput) loginInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') login(); });
        });


        // ==================== 온라인 데이터베이스 설정 ====================

        const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxyuQ9Jbfe47qKtYqRfrBJdEQgbHPed7QUb1VaBB0GgIfFFfUw_o8EDFXWDnFFCoeWV/exec';

        const APP_PASSWORD = 'Screen10000**';

        let userPassword = '';

        let isOnlineMode = true; // 온라인 모드 활성화



        // 로그인 함수

        function login() {

            const password = document.getElementById('loginPasswordInput').value;

            

            if (password === APP_PASSWORD) {

                userPassword = password;

                document.getElementById('loginScreen').style.display = 'none';

                document.getElementById('mainApp').style.display = 'block';

                document.getElementById('loginError').style.display = 'none';

                

                // 연결 테스트

                testConnection();

                

                // 초기 데이터 로드

                loadOnlineCalculations();

            } else {

                document.getElementById('loginError').style.display = 'block';

                document.getElementById('loginPasswordInput').value = '';

                document.getElementById('loginPasswordInput').focus();

            }

        }



        // 연결 테스트

        // 1. 저장 함수 (CORS 우회를 위해 mode: 'no-cors' 사용)

async function saveToGoogleSheets(type, widthInch, heightInch, customerInfo, results) {

    try {

        const payload = {

            password: APP_PASSWORD,

            action: 'save',

            type: type,

            widthInch: widthInch,

            heightInch: heightInch,

            customer: customerInfo.customer,

            date: customerInfo.date,

            address: customerInfo.address,

            location: customerInfo.location,

            email: customerInfo.email,

            phone: customerInfo.phone,

            frameColor: customerInfo.frameColor,

            meshColor: customerInfo.meshColor,

            results: results

        };



        await fetch(GOOGLE_SCRIPT_URL, {

            method: 'POST',

            mode: 'no-cors', // CORS 정책 차단 우회

            headers: { 'Content-Type': 'text/plain' },

            body: JSON.stringify(payload)

        });



        return { success: true }; 

    } catch (error) {

        console.error('저장 에러:', error);

        return { success: false, error: error.message };

    }

} // <--- 괄호가 누락되지 않았는지 꼭 확인!



// 2. 연결 테스트 함수 (오타 수정)

async function testConnection() {

    try {

        const response = await fetch(GOOGLE_SCRIPT_URL + '?password=' + encodeURIComponent(APP_PASSWORD) + '&action=load');

        const data = await response.json();

        if (data.success) {

            console.log('✅ 연결 성공! 데이터:', data.data.length, '개');

        }

    } catch (error) {

        console.error('❌ 연결 실패:', error);

    }

}

        // Google Sheets에서 불러오기

        async function loadOnlineCalculations() {

            try {

                const response = await fetch(GOOGLE_SCRIPT_URL + '?password=' + encodeURIComponent(userPassword) + '&action=load', {

                    method: 'GET',

                });

                

                const data = await response.json();

                

                if (data.success) {

                    allCalculationsCache = data.data || [];

                    console.log('📊 온라인 데이터 로드:', allCalculationsCache.length + '개');

                } else {

                    console.error('데이터 로드 실패:', data.error);

                    allCalculationsCache = [];

                }

            } catch (error) {

                console.error('온라인 데이터 로드 오류:', error);

                allCalculationsCache = [];

            }

        }



        // 온라인 삭제

        async function deleteOnlineCalculation(id) {

            try {

                const response = await fetch(GOOGLE_SCRIPT_URL, {

                    method: 'POST',

                    headers: {

                        'Content-Type': 'application/json',

                    },

                    body: JSON.stringify({

                        password: userPassword,

                        action: 'delete',

                        id: id

                    })

                });

                const data = await response.json();

                return data;

            } catch (error) {

                console.error('삭제 오류:', error);

                return { success: false };

            }

        }



        // ==================== 기존 IndexedDB 설정 (백업용) ====================

        // IndexedDB 데이터베이스 설정

        let db;

        let allCalculationsCache = []; // 전체 데이터 캐시

        const DB_NAME = 'ScreenCalculatorDB';

        const DB_VERSION = 1;

        const STORE_NAME = 'calculations';



        // 데이터베이스 초기화

        function initDB() {

            return new Promise((resolve, reject) => {

                const request = indexedDB.open(DB_NAME, DB_VERSION);



                request.onerror = () => reject(request.error);

                request.onsuccess = () => {

                    db = request.result;

                    resolve(db);

                };



                request.onupgradeneeded = (event) => {

                    db = event.target.result;

                    if (!db.objectStoreNames.contains(STORE_NAME)) {

                        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });

                        objectStore.createIndex('timestamp', 'timestamp', { unique: false });

                        objectStore.createIndex('type', 'type', { unique: false });

                    }

                };

            });

        }



        // 계산 결과 저장

        function saveCalculation(type, width, height, results) {

            return new Promise((resolve, reject) => {

                const transaction = db.transaction([STORE_NAME], 'readwrite');

                const objectStore = transaction.objectStore(STORE_NAME);



                const data = {

                    timestamp: new Date().toISOString(),

                    type: type,

                    width: width,

                    height: height,

                    results: results

                };



                const request = objectStore.add(data);

                request.onsuccess = () => resolve(request.result);

                request.onerror = () => reject(request.error);

            });

        }



        // 고객정보 포함 저장 (인치 단위)

        function saveCalculationWithCustomer(type, widthInch, heightInch, customerInfo, results) {

            return new Promise((resolve, reject) => {

                const transaction = db.transaction([STORE_NAME], 'readwrite');

                const objectStore = transaction.objectStore(STORE_NAME);



                const data = {

                    timestamp: new Date().toISOString(),

                    type: type,

                    widthInch: widthInch,

                    heightInch: heightInch,

                    customer: customerInfo.customer,

                    date: customerInfo.date,

                    address: customerInfo.address,

                    location: customerInfo.location,

                    email: customerInfo.email,

                    phone: customerInfo.phone,

                    frameColor: customerInfo.frameColor,

                    meshColor: customerInfo.meshColor,

                    results: results

                };



                const request = objectStore.add(data);

                request.onsuccess = () => resolve(request.result);

                request.onerror = () => reject(request.error);

            });

        }



        // 모든 계산 결과 불러오기

        function getAllCalculations() {

            return new Promise((resolve, reject) => {

                const transaction = db.transaction([STORE_NAME], 'readonly');

                const objectStore = transaction.objectStore(STORE_NAME);

                const request = objectStore.getAll();



                request.onsuccess = () => resolve(request.result);

                request.onerror = () => reject(request.error);

            });

        }



        // 특정 계산 결과 삭제

        function deleteCalculation(id) {

            return new Promise((resolve, reject) => {

                const transaction = db.transaction([STORE_NAME], 'readwrite');

                const objectStore = transaction.objectStore(STORE_NAME);

                const request = objectStore.delete(id);



                request.onsuccess = () => resolve();

                request.onerror = () => reject(request.error);

            });

        }



        // 모든 계산 결과 삭제

        function clearAllCalculations() {

            return new Promise((resolve, reject) => {

                const transaction = db.transaction([STORE_NAME], 'readwrite');

                const objectStore = transaction.objectStore(STORE_NAME);

                const request = objectStore.clear();



                request.onsuccess = () => resolve();

                request.onerror = () => reject(request.error);

            });

        }



        // 데이터베이스 초기화 실행

        initDB()

            .then(() => {

                console.log('✅ 데이터베이스 초기화 완료');

            })

            .catch(error => {

                console.error('❌ Database initialization error:', error);

                alert('데이터베이스 초기화에 실패했습니다. 브라우저를 새로고침해주세요.');

            });



        // 팝업 타이머

        let modalOpenTimer = null;

        let modalCloseTimer = null;

        

        // 구조도 표시 (호버용)

        function showStructureDiagram(type) {

            // 닫기 타이머가 있으면 취소

            if (modalCloseTimer) {

                clearTimeout(modalCloseTimer);

                modalCloseTimer = null;

            }

            

            // 기존 열기 타이머가 있으면 취소

            if (modalOpenTimer) {

                clearTimeout(modalOpenTimer);

            }

            

            // 약간의 지연 후 팝업 표시

            modalOpenTimer = setTimeout(() => {

                const modal = document.getElementById('structureModal');

                const modalTitle = document.getElementById('modalTitle');

                const modalImage = document.getElementById('modalImage');

                

                if (type === 'single') {

                    modalTitle.textContent = '외도어 편개형 구조도';

                    modalImage.src = 'single-door-structure.png';

                    modalImage.alt = '외도어 편개형 구조도';

                } else {

                    modalTitle.textContent = '양개형 구조도';

                    modalImage.src = 'double-door-structure.png';

                    modalImage.alt = '양개형 구조도';

                }

                

                modal.style.display = 'block';

            }, 200); // 200ms 지연

        }

        

        // 구조도 숨기기 (호버 종료 시)

        function hideStructureDiagram() {

            // 열기 타이머가 있으면 취소 (아직 열리지 않은 경우)

            if (modalOpenTimer) {

                clearTimeout(modalOpenTimer);

                modalOpenTimer = null;

            }

            

            // 약간의 지연 후 팝업 닫기

            modalCloseTimer = setTimeout(() => {

                const modal = document.getElementById('structureModal');

                modal.style.display = 'none';

            }, 200); // 200ms 지연

        }

        

        // 모달 위에 마우스가 있을 때 닫기 취소

        function keepModalOpen() {

            if (modalCloseTimer) {

                clearTimeout(modalCloseTimer);

                modalCloseTimer = null;

            }

        }

        

        // 부속 리스트 표시 (호버용)

        let partsModalOpenTimer = null;

        let partsModalCloseTimer = null;

        

        function showPartsList(type) {

            // 닫기 타이머가 있으면 취소

            if (partsModalCloseTimer) {

                clearTimeout(partsModalCloseTimer);

                partsModalCloseTimer = null;

            }

            

            // 기존 열기 타이머가 있으면 취소

            if (partsModalOpenTimer) {

                clearTimeout(partsModalOpenTimer);

            }

            

            // 약간의 지연 후 팝업 표시

            partsModalOpenTimer = setTimeout(() => {

                const modal = document.getElementById('partsModal');

                const modalTitle = document.getElementById('partsModalTitle');

                const modalBody = document.getElementById('partsModalBody');

                

                let partsHTML = '';

                

                if (type === 'single') {

                    modalTitle.textContent = '외도어 편개형 부속 리스트';

                    partsHTML = `

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">

                            <!-- Top Rail -->

                            <div style="padding: 15px; border: 2px solid #2C5F2D; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="5" y="35" width="90" height="30" fill="#2C5F2D" rx="3"/>

                                    <text x="50" y="85" fill="#2C5F2D" font-size="10" text-anchor="middle" font-weight="bold">32mm</text>

                                </svg>

                                <div style="font-weight: bold; color: #2C5F2D; margin-bottom: 5px;">Top Rail 32mm</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">상단 프레임</div>

                                <div style="font-weight: bold; color: #D4851C;">× 1개</div>

                            </div>



                            <!-- Bottom Rail -->

                            <div style="padding: 15px; border: 2px solid #2C5F2D; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="5" y="35" width="90" height="30" fill="#2C5F2D" rx="3"/>

                                    <text x="50" y="85" fill="#2C5F2D" font-size="10" text-anchor="middle" font-weight="bold">32mm</text>

                                </svg>

                                <div style="font-weight: bold; color: #2C5F2D; margin-bottom: 5px;">Bottom Rail 32mm</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">하단 프레임</div>

                                <div style="font-weight: bold; color: #D4851C;">× 1개</div>

                            </div>



                            <!-- Vertical Rail -->

                            <div style="padding: 15px; border: 2px solid #2C5F2D; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="35" y="5" width="30" height="90" fill="#2C5F2D" rx="3"/>

                                    <text x="50" y="55" fill="white" font-size="10" text-anchor="middle" font-weight="bold">32mm</text>

                                </svg>

                                <div style="font-weight: bold; color: #2C5F2D; margin-bottom: 5px;">Vertical Rail 32mm</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">벽면바</div>

                                <div style="font-weight: bold; color: #D4851C;">× 2개</div>

                            </div>



                            <!-- Large Fix Rail -->

                            <div style="padding: 15px; border: 2px solid #2C5F2D; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="35" y="5" width="30" height="90" fill="#2C5F2D" rx="3"/>

                                    <circle cx="50" cy="20" r="5" fill="#C84630" stroke="white" stroke-width="1.5"/>

                                    <circle cx="50" cy="50" r="5" fill="#C84630" stroke="white" stroke-width="1.5"/>

                                    <circle cx="50" cy="80" r="5" fill="#C84630" stroke="white" stroke-width="1.5"/>

                                </svg>

                                <div style="font-weight: bold; color: #2C5F2D; margin-bottom: 5px;">Large Fix Rail 26mm</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">큰 경첩바</div>

                                <div style="font-weight: bold; color: #D4851C;">× 1개</div>

                            </div>



                            <!-- Small Fix Rail -->

                            <div style="padding: 15px; border: 2px solid #2C5F2D; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="35" y="5" width="30" height="90" fill="#2C5F2D" rx="3"/>

                                    <circle cx="50" cy="30" r="5" fill="#C84630" stroke="white" stroke-width="1.5"/>

                                    <circle cx="50" cy="70" r="5" fill="#C84630" stroke="white" stroke-width="1.5"/>

                                </svg>

                                <div style="font-weight: bold; color: #2C5F2D; margin-bottom: 5px;">Small Fix Rail 26mm</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">작은 경첩바</div>

                                <div style="font-weight: bold; color: #D4851C;">× 1개</div>

                            </div>



                            <!-- Pull Rod Male -->

                            <div style="padding: 15px; border: 2px solid #4A8B4D; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="40" y="30" width="20" height="40" fill="#4A8B4D" rx="6" stroke="white" stroke-width="1.5"/>

                                    <circle cx="50" cy="50" r="8" fill="#2C5F2D"/>

                                    <rect x="48" y="58" width="4" height="8" fill="#2C5F2D"/>

                                    <text x="50" y="85" fill="#4A8B4D" font-size="10" text-anchor="middle" font-weight="bold">♂</text>

                                </svg>

                                <div style="font-weight: bold; color: #4A8B4D; margin-bottom: 5px;">Pull Rod 26mm (Male)</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">손잡이바 (숫놈)</div>

                                <div style="font-weight: bold; color: #D4851C;">× 1개</div>

                            </div>



                            <!-- Corner Jointer -->

                            <div style="padding: 15px; border: 2px solid #6B6B6B; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="30" y="30" width="40" height="8" fill="#6B6B6B" rx="2"/>

                                    <rect x="30" y="30" width="8" height="40" fill="#6B6B6B" rx="2"/>

                                    <circle cx="34" cy="34" r="2.5" fill="#C84630"/>

                                </svg>

                                <div style="font-weight: bold; color: #6B6B6B; margin-bottom: 5px;">Corner Jointer</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">코너 조인트</div>

                                <div style="font-weight: bold; color: #D4851C;">× 4개</div>

                            </div>



                            <!-- Installation Bracket -->

                            <div style="padding: 15px; border: 2px solid #6B6B6B; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="35" y="20" width="30" height="60" fill="#6B6B6B" rx="3"/>

                                    <circle cx="50" cy="35" r="3" fill="white"/>

                                    <circle cx="50" cy="50" r="3" fill="white"/>

                                    <circle cx="50" cy="65" r="3" fill="white"/>

                                </svg>

                                <div style="font-weight: bold; color: #6B6B6B; margin-bottom: 5px;">Installation Bracket</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">설치 브라켓</div>

                                <div style="font-weight: bold; color: #D4851C;">× 8개</div>

                            </div>



                            <!-- Clamshell Nut -->

                            <div style="padding: 15px; border: 2px solid #8B7355; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <circle cx="50" cy="50" r="20" fill="#8B7355" stroke="#6B5345" stroke-width="2"/>

                                    <circle cx="50" cy="50" r="10" fill="none" stroke="#6B5345" stroke-width="2"/>

                                    <line x1="50" y1="30" x2="50" y2="40" stroke="#6B5345" stroke-width="2"/>

                                    <line x1="50" y1="60" x2="50" y2="70" stroke="#6B5345" stroke-width="2"/>

                                    <line x1="30" y1="50" x2="40" y2="50" stroke="#6B5345" stroke-width="2"/>

                                    <line x1="60" y1="50" x2="70" y2="50" stroke="#6B5345" stroke-width="2"/>

                                </svg>

                                <div style="font-weight: bold; color: #8B7355; margin-bottom: 5px;">Clamshell Nut</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">클램쉘 너트</div>

                                <div style="font-weight: bold; color: #D4851C;">적정 수량</div>

                            </div>



                            <!-- Magnet Base -->

                            <div style="padding: 15px; border: 2px solid #8B0000; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="20" y="35" width="60" height="30" fill="#DC143C" rx="4" stroke="#8B0000" stroke-width="2"/>

                                    <circle cx="35" cy="50" r="5" fill="white"/>

                                    <circle cx="50" cy="50" r="5" fill="white"/>

                                    <circle cx="65" cy="50" r="5" fill="white"/>

                                    <rect x="45" y="30" width="10" height="5" fill="#8B0000" rx="1"/>

                                </svg>

                                <div style="font-weight: bold; color: #8B0000; margin-bottom: 5px;">Magnet Base</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">자석대</div>

                                <div style="font-weight: bold; color: #D4851C;">× 1개</div>

                            </div>



                            <!-- Magnet -->

                            <div style="padding: 15px; border: 2px solid #C41E3A; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <path d="M 30,30 Q 30,20 40,20 L 60,20 Q 70,20 70,30 L 70,70 Q 70,80 60,80 L 40,80 Q 30,80 30,70 Z" fill="#DC143C" stroke="#8B0000" stroke-width="2"/>

                                    <text x="35" y="55" fill="white" font-size="20" font-weight="bold">N</text>

                                    <text x="60" y="55" fill="white" font-size="20" font-weight="bold">S</text>

                                    <line x1="50" y1="25" x2="50" y2="75" stroke="white" stroke-width="2"/>

                                </svg>

                                <div style="font-weight: bold; color: #C41E3A; margin-bottom: 5px;">Magnet</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">자석</div>

                                <div style="font-weight: bold; color: #D4851C;">× 2개</div>

                            </div>



                            <!-- Handle Roller Female -->

                            <div style="padding: 15px; border: 2px solid #9B59B6; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <circle cx="50" cy="50" r="25" fill="#9B59B6" stroke="#7D3C98" stroke-width="2"/>

                                    <circle cx="50" cy="50" r="18" fill="none" stroke="white" stroke-width="2"/>

                                    <circle cx="50" cy="50" r="10" fill="#7D3C98"/>

                                    <rect x="48" y="35" width="4" height="10" fill="white"/>

                                    <text x="50" y="80" fill="#9B59B6" font-size="12" text-anchor="middle" font-weight="bold">♀</text>

                                </svg>

                                <div style="font-weight: bold; color: #9B59B6; margin-bottom: 5px;">Handle Roller (Female)</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">손잡이롤러 (암놈)</div>

                                <div style="font-weight: bold; color: #D4851C;">× 1개</div>

                            </div>



                            <!-- Handle Roller Male -->

                            <div style="padding: 15px; border: 2px solid #3498DB; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <circle cx="50" cy="50" r="25" fill="#3498DB" stroke="#2874A6" stroke-width="2"/>

                                    <circle cx="50" cy="50" r="18" fill="none" stroke="white" stroke-width="2"/>

                                    <circle cx="50" cy="50" r="10" fill="#2874A6"/>

                                    <rect x="48" y="55" width="4" height="10" fill="white"/>

                                    <text x="50" y="80" fill="#3498DB" font-size="12" text-anchor="middle" font-weight="bold">♂</text>

                                </svg>

                                <div style="font-weight: bold; color: #3498DB; margin-bottom: 5px;">Handle Roller (Male)</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">손잡이롤러 (숫놈)</div>

                                <div style="font-weight: bold; color: #D4851C;">× 1개</div>

                            </div>



                            <!-- PVC Pipe -->

                            <div style="padding: 15px; border: 2px solid #95A5A6; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="25" y="35" width="50" height="30" fill="#BDC3C7" rx="3"/>

                                    <rect x="27" y="37" width="46" height="26" fill="#ECF0F1" rx="2"/>

                                    <line x1="35" y1="35" x2="35" y2="65" stroke="#95A5A6" stroke-width="1.5"/>

                                    <line x1="45" y1="35" x2="45" y2="65" stroke="#95A5A6" stroke-width="1.5"/>

                                    <line x1="55" y1="35" x2="55" y2="65" stroke="#95A5A6" stroke-width="1.5"/>

                                    <line x1="65" y1="35" x2="65" y2="65" stroke="#95A5A6" stroke-width="1.5"/>

                                </svg>

                                <div style="font-weight: bold; color: #95A5A6; margin-bottom: 5px;">PVC Pipe</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">PVC파이프 (자석대 연결용)</div>

                                <div style="font-weight: bold; color: #D4851C;">× 1개</div>

                            </div>

                        </div>

                    `;

                } else {

                    modalTitle.textContent = '양개형 부속 리스트';

                    partsHTML = `

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">

                            <!-- Top Rail -->

                            <div style="padding: 15px; border: 2px solid #2C5F2D; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="5" y="35" width="90" height="30" fill="#2C5F2D" rx="3"/>

                                    <text x="50" y="85" fill="#2C5F2D" font-size="10" text-anchor="middle" font-weight="bold">32mm</text>

                                </svg>

                                <div style="font-weight: bold; color: #2C5F2D; margin-bottom: 5px;">Top Rail 32mm</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">상단 프레임</div>

                                <div style="font-weight: bold; color: #D4851C;">× 2개</div>

                            </div>



                            <!-- Bottom Rail -->

                            <div style="padding: 15px; border: 2px solid #2C5F2D; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="5" y="35" width="90" height="30" fill="#2C5F2D" rx="3"/>

                                    <text x="50" y="85" fill="#2C5F2D" font-size="10" text-anchor="middle" font-weight="bold">32mm</text>

                                </svg>

                                <div style="font-weight: bold; color: #2C5F2D; margin-bottom: 5px;">Bottom Rail 32mm</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">하단 프레임</div>

                                <div style="font-weight: bold; color: #D4851C;">× 2개</div>

                            </div>



                            <!-- Vertical Rail -->

                            <div style="padding: 15px; border: 2px solid #2C5F2D; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="35" y="5" width="30" height="90" fill="#2C5F2D" rx="3"/>

                                    <text x="50" y="55" fill="white" font-size="10" text-anchor="middle" font-weight="bold">32mm</text>

                                </svg>

                                <div style="font-weight: bold; color: #2C5F2D; margin-bottom: 5px;">Vertical Rail 32mm</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">벽면바</div>

                                <div style="font-weight: bold; color: #D4851C;">× 2개</div>

                            </div>



                            <!-- Large Fix Rail -->

                            <div style="padding: 15px; border: 2px solid #2C5F2D; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="35" y="5" width="30" height="90" fill="#2C5F2D" rx="3"/>

                                    <circle cx="50" cy="20" r="5" fill="#C84630" stroke="white" stroke-width="1.5"/>

                                    <circle cx="50" cy="50" r="5" fill="#C84630" stroke="white" stroke-width="1.5"/>

                                    <circle cx="50" cy="80" r="5" fill="#C84630" stroke="white" stroke-width="1.5"/>

                                </svg>

                                <div style="font-weight: bold; color: #2C5F2D; margin-bottom: 5px;">Large Fix Rail 26mm</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">큰 경첩바</div>

                                <div style="font-weight: bold; color: #D4851C;">× 2개</div>

                            </div>



                            <!-- Pull Rod Female -->

                            <div style="padding: 15px; border: 2px solid #D4A574; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="40" y="30" width="20" height="40" fill="#D4A574" rx="6" stroke="white" stroke-width="1.5"/>

                                    <circle cx="50" cy="50" r="8" fill="#B8926A"/>

                                    <rect x="48" y="42" width="4" height="8" fill="#B8926A"/>

                                    <text x="50" y="85" fill="#D4A574" font-size="10" text-anchor="middle" font-weight="bold">♀</text>

                                </svg>

                                <div style="font-weight: bold; color: #D4A574; margin-bottom: 5px;">Pull Rod 26mm (Female)</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">손잡이바 (암놈)</div>

                                <div style="font-weight: bold; color: #D4851C;">× 1개</div>

                            </div>



                            <!-- Pull Rod Male -->

                            <div style="padding: 15px; border: 2px solid #4A8B4D; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="40" y="30" width="20" height="40" fill="#4A8B4D" rx="6" stroke="white" stroke-width="1.5"/>

                                    <circle cx="50" cy="50" r="8" fill="#2C5F2D"/>

                                    <rect x="48" y="58" width="4" height="8" fill="#2C5F2D"/>

                                    <text x="50" y="85" fill="#4A8B4D" font-size="10" text-anchor="middle" font-weight="bold">♂</text>

                                </svg>

                                <div style="font-weight: bold; color: #4A8B4D; margin-bottom: 5px;">Pull Rod 26mm (Male)</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">손잡이바 (숫놈)</div>

                                <div style="font-weight: bold; color: #D4851C;">× 1개</div>

                            </div>



                            <!-- Corner Jointer -->

                            <div style="padding: 15px; border: 2px solid #6B6B6B; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="30" y="30" width="40" height="8" fill="#6B6B6B" rx="2"/>

                                    <rect x="30" y="30" width="8" height="40" fill="#6B6B6B" rx="2"/>

                                    <circle cx="34" cy="34" r="2.5" fill="#C84630"/>

                                </svg>

                                <div style="font-weight: bold; color: #6B6B6B; margin-bottom: 5px;">Corner Jointer</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">코너 조인트</div>

                                <div style="font-weight: bold; color: #D4851C;">× 4개</div>

                            </div>



                            <!-- Installation Bracket -->

                            <div style="padding: 15px; border: 2px solid #6B6B6B; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="35" y="20" width="30" height="60" fill="#6B6B6B" rx="3"/>

                                    <circle cx="50" cy="35" r="3" fill="white"/>

                                    <circle cx="50" cy="50" r="3" fill="white"/>

                                    <circle cx="50" cy="65" r="3" fill="white"/>

                                </svg>

                                <div style="font-weight: bold; color: #6B6B6B; margin-bottom: 5px;">Installation Bracket</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">설치 브라켓</div>

                                <div style="font-weight: bold; color: #D4851C;">× 8개</div>

                            </div>



                            <!-- String Adjuster -->

                            <div style="padding: 15px; border: 2px solid #4A5568; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="35" y="40" width="30" height="20" fill="#4A5568" rx="3"/>

                                    <circle cx="50" cy="50" r="8" fill="#2D3748"/>

                                    <circle cx="50" cy="50" r="5" fill="#718096"/>

                                    <line x1="28" y1="50" x2="35" y2="50" stroke="#C84630" stroke-width="2"/>

                                    <line x1="65" y1="50" x2="72" y2="50" stroke="#C84630" stroke-width="2"/>

                                    <circle cx="28" cy="50" r="2" fill="#C84630"/>

                                    <circle cx="72" cy="50" r="2" fill="#C84630"/>

                                </svg>

                                <div style="font-weight: bold; color: #4A5568; margin-bottom: 5px;">String Adjuster</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">실조절기</div>

                                <div style="font-weight: bold; color: #D4851C;">× 2개</div>

                            </div>



                            <!-- Magnet Base -->

                            <div style="padding: 15px; border: 2px solid #8B0000; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="20" y="35" width="60" height="30" fill="#DC143C" rx="4" stroke="#8B0000" stroke-width="2"/>

                                    <circle cx="35" cy="50" r="5" fill="white"/>

                                    <circle cx="50" cy="50" r="5" fill="white"/>

                                    <circle cx="65" cy="50" r="5" fill="white"/>

                                    <rect x="45" y="30" width="10" height="5" fill="#8B0000" rx="1"/>

                                </svg>

                                <div style="font-weight: bold; color: #8B0000; margin-bottom: 5px;">Magnet Base</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">자석대</div>

                                <div style="font-weight: bold; color: #D4851C;">× 2개</div>

                            </div>



                            <!-- Magnet -->

                            <div style="padding: 15px; border: 2px solid #C41E3A; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <path d="M 30,30 Q 30,20 40,20 L 60,20 Q 70,20 70,30 L 70,70 Q 70,80 60,80 L 40,80 Q 30,80 30,70 Z" fill="#DC143C" stroke="#8B0000" stroke-width="2"/>

                                    <text x="35" y="55" fill="white" font-size="20" font-weight="bold">N</text>

                                    <text x="60" y="55" fill="white" font-size="20" font-weight="bold">S</text>

                                    <line x1="50" y1="25" x2="50" y2="75" stroke="white" stroke-width="2"/>

                                </svg>

                                <div style="font-weight: bold; color: #C41E3A; margin-bottom: 5px;">Magnet</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">자석</div>

                                <div style="font-weight: bold; color: #D4851C;">× 4개</div>

                            </div>



                            <!-- Handle Roller Female -->

                            <div style="padding: 15px; border: 2px solid #9B59B6; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <circle cx="50" cy="50" r="25" fill="#9B59B6" stroke="#7D3C98" stroke-width="2"/>

                                    <circle cx="50" cy="50" r="18" fill="none" stroke="white" stroke-width="2"/>

                                    <circle cx="50" cy="50" r="10" fill="#7D3C98"/>

                                    <rect x="48" y="35" width="4" height="10" fill="white"/>

                                    <text x="50" y="80" fill="#9B59B6" font-size="12" text-anchor="middle" font-weight="bold">♀</text>

                                </svg>

                                <div style="font-weight: bold; color: #9B59B6; margin-bottom: 5px;">Handle Roller (Female)</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">손잡이롤러 (암놈)</div>

                                <div style="font-weight: bold; color: #D4851C;">× 1개</div>

                            </div>



                            <!-- Handle Roller Male -->

                            <div style="padding: 15px; border: 2px solid #3498DB; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <circle cx="50" cy="50" r="25" fill="#3498DB" stroke="#2874A6" stroke-width="2"/>

                                    <circle cx="50" cy="50" r="18" fill="none" stroke="white" stroke-width="2"/>

                                    <circle cx="50" cy="50" r="10" fill="#2874A6"/>

                                    <rect x="48" y="55" width="4" height="10" fill="white"/>

                                    <text x="50" y="80" fill="#3498DB" font-size="12" text-anchor="middle" font-weight="bold">♂</text>

                                </svg>

                                <div style="font-weight: bold; color: #3498DB; margin-bottom: 5px;">Handle Roller (Male)</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">손잡이롤러 (숫놈)</div>

                                <div style="font-weight: bold; color: #D4851C;">× 1개</div>

                            </div>



                            <!-- PVC Pipe -->

                            <div style="padding: 15px; border: 2px solid #95A5A6; border-radius: 12px; text-align: center; background: #f9f9f9;">

                                <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 10px;">

                                    <rect x="25" y="35" width="50" height="30" fill="#BDC3C7" rx="3"/>

                                    <rect x="27" y="37" width="46" height="26" fill="#ECF0F1" rx="2"/>

                                    <line x1="35" y1="35" x2="35" y2="65" stroke="#95A5A6" stroke-width="1.5"/>

                                    <line x1="45" y1="35" x2="45" y2="65" stroke="#95A5A6" stroke-width="1.5"/>

                                    <line x1="55" y1="35" x2="55" y2="65" stroke="#95A5A6" stroke-width="1.5"/>

                                    <line x1="65" y1="35" x2="65" y2="65" stroke="#95A5A6" stroke-width="1.5"/>

                                </svg>

                                <div style="font-weight: bold; color: #95A5A6; margin-bottom: 5px;">PVC Pipe</div>

                                <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">PVC파이프 (자석대 연결용)</div>

                                <div style="font-weight: bold; color: #D4851C;">× 2개</div>

                            </div>

                        </div>

                    `;

                }

                

                modalBody.innerHTML = partsHTML;

                modal.style.display = 'block';

            }, 200); // 200ms 지연

        }

        

        // 부속 리스트 숨기기 (호버 종료 시)

        function hidePartsList() {

            // 열기 타이머가 있으면 취소

            if (partsModalOpenTimer) {

                clearTimeout(partsModalOpenTimer);

                partsModalOpenTimer = null;

            }

            

            // 약간의 지연 후 팝업 닫기

            partsModalCloseTimer = setTimeout(() => {

                const modal = document.getElementById('partsModal');

                modal.style.display = 'none';

            }, 200); // 200ms 지연

        }

        

        // 부속 리스트 모달 위에 마우스가 있을 때 닫기 취소

        function keepPartsModalOpen() {

            if (partsModalCloseTimer) {

                clearTimeout(partsModalCloseTimer);

                partsModalCloseTimer = null;

            }

        }

        

        // 부속 리스트 모달 즉시 닫기 (버튼용)

        function closePartsModalDirect() {

            if (partsModalOpenTimer) {

                clearTimeout(partsModalOpenTimer);

                partsModalOpenTimer = null;

            }

            if (partsModalCloseTimer) {

                clearTimeout(partsModalCloseTimer);

                partsModalCloseTimer = null;

            }

            const modal = document.getElementById('partsModal');

            modal.style.display = 'none';

        }

        

        // 팝업 모달 열기

        function openModal(type) {

            // 닫기 타이머가 있으면 취소

            if (modalCloseTimer) {

                clearTimeout(modalCloseTimer);

                modalCloseTimer = null;

            }

            

            // 기존 열기 타이머가 있으면 취소

            if (modalOpenTimer) {

                clearTimeout(modalOpenTimer);

            }

            

            // 약간의 지연 후 팝업 표시 (자연스러운 hover 효과)

            modalOpenTimer = setTimeout(() => {

                const modal = document.getElementById('structureModal');

                const modalTitle = document.getElementById('modalTitle');

                const modalImage = document.getElementById('modalImage');

                

                if (type === 'single') {

                    modalTitle.textContent = '외도어 편개형 구조도';

                    modalImage.src = '/mnt/user-data/uploads/single-door-structure.png';

                    modalImage.alt = '외도어 편개형 구조도';

                } else {

                    modalTitle.textContent = '양개형 구조도';

                    modalImage.src = '/mnt/user-data/uploads/double-door-structure.png';

                    modalImage.alt = '양개형 구조도';

                }

                

                modal.style.display = 'block';

            }, 300); // 300ms 지연

        }

        

        // 아이콘에서 마우스가 벗어나면 즉시 팝업 닫기

        function closeModalImmediately() {

            // 열기 타이머가 있으면 취소 (아직 열리지 않은 경우)

            if (modalOpenTimer) {

                clearTimeout(modalOpenTimer);

                modalOpenTimer = null;

            }

            

            // 기존 닫기 타이머가 있으면 취소

            if (modalCloseTimer) {

                clearTimeout(modalCloseTimer);

            }

            

            // 즉시 닫기 (지연 없음)

            const structureModal = document.getElementById('structureModal');

            structureModal.style.display = 'none';

        }

        

        // 팝업 닫기 예약 (모달 위에서 사용)

        function scheduleCloseModal() {

            // 기존 닫기 타이머가 있으면 취소

            if (modalCloseTimer) {

                clearTimeout(modalCloseTimer);

            }

            

            // 약간의 지연 후 팝업 닫기

            modalCloseTimer = setTimeout(() => {

                const modal = document.getElementById('structureModal');

                modal.style.display = 'none';

            }, 200); // 200ms 지연

        }

        

        // 팝업 닫기 취소

        function cancelCloseModal() {

            if (modalCloseTimer) {

                clearTimeout(modalCloseTimer);

                modalCloseTimer = null;

            }

        }

        

        // 팝업 모달 즉시 닫기 (버튼/ESC/외부클릭)

        function closeModal() {

            // 모든 타이머 취소

            if (modalOpenTimer) {

                clearTimeout(modalOpenTimer);

                modalOpenTimer = null;

            }

            if (modalCloseTimer) {

                clearTimeout(modalCloseTimer);

                modalCloseTimer = null;

            }

            

            const modal = document.getElementById('structureModal');

            modal.style.display = 'none';

        }

        

        // 모달 외부 클릭 시 닫기

        window.onclick = function(event) {

            const modal = document.getElementById('structureModal');

            if (event.target === modal) {

                closeModal();

            }

        }

        

        // ESC 키로 모달 닫기

        document.addEventListener('keydown', function(event) {

            if (event.key === 'Escape') {

                closeModal();

            }

        });

        

        // 이미지 로드 에러 처리

        function handleImageError() {

            const modalImage = document.getElementById('modalImage');

            const imageError = document.getElementById('imageError');

            

            modalImage.style.display = 'none';

            imageError.style.display = 'block';

        }

        

        // 이미지 로드 성공 처리

        function handleImageLoad() {

            const modalImage = document.getElementById('modalImage');

            const imageError = document.getElementById('imageError');

            

            modalImage.style.display = 'block';

            imageError.style.display = 'none';

        }

        

        // 부품 리스트 팝업 열기

        

        // 최대공약수 계산 함수 (유클리드 호제법)

        function calculateGCD(a, b) {

            while (b !== 0) {

                const temp = b;

                b = a % b;

                a = temp;

            }

            return a;

        }

        

        // mm를 인치 분수로 변환 (1/16 단위)

        function mmToInchFraction(mm) {

            const inches = mm / 25.4;

            const whole = Math.floor(inches);

            const decimal = inches - whole;

            const sixteenths = Math.round(decimal * 16);

            

            if (sixteenths === 0) {

                return whole === 0 ? '0"' : `${whole}"`;

            }

            

            if (sixteenths === 16) {

                return `${whole + 1}"`;

            }

            

            // 분수 간소화

            let numerator = sixteenths;

            let denominator = 16;

            

            const divisor = calculateGCD(numerator, denominator);

            numerator /= divisor;

            denominator /= divisor;

            

            if (whole === 0) {

                return `${numerator}/${denominator}"`;

            } else {

                return `${whole} ${numerator}/${denominator}"`;

            }

        }

        

        // inch 값을 분수 형식으로 변환 (1/16 단위)

        function inchToFraction(inches) {

            const whole = Math.floor(inches);

            const decimal = inches - whole;

            const sixteenths = Math.round(decimal * 16);

            

            if (sixteenths === 0) {

                return whole === 0 ? '0' : `${whole}`;

            }

            

            if (sixteenths === 16) {

                return `${whole + 1}`;

            }

            

            // 분수 간소화

            let numerator = sixteenths;

            let denominator = 16;

            

            const divisor = calculateGCD(numerator, denominator);

            numerator /= divisor;

            denominator /= divisor;

            

            if (whole === 0) {

                return `${numerator}/${denominator}`;

            } else {

                return `${whole} ${numerator}/${denominator}`;

            }

        }



        // 인치를 피트-인치 분수로 변환

        function inchToFeetInch(totalInches) {

            const feet = Math.floor(totalInches / 12);

            const inches = totalInches % 12;

            const whole = Math.floor(inches);

            const decimal = inches - whole;

            const sixteenths = Math.round(decimal * 16);

            

            if (sixteenths === 0) {

                if (feet === 0) {

                    return whole === 0 ? '0"' : `${whole}"`;

                }

                return whole === 0 ? `${feet}'` : `${feet}' ${whole}"`;

            }

            

            if (sixteenths === 16) {

                const newWhole = whole + 1;

                if (newWhole === 12) {

                    return `${feet + 1}'`;

                }

                if (feet === 0) {

                    return `${newWhole}"`;

                }

                return `${feet}' ${newWhole}"`;

            }

            

            // 분수 간소화

            let numerator = sixteenths;

            let denominator = 16;

            const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);

            const divisor = gcd(numerator, denominator);

            numerator /= divisor;

            denominator /= divisor;

            

            if (feet === 0) {

                if (whole === 0) {

                    return `${numerator}/${denominator}"`;

                } else {

                    return `${whole} ${numerator}/${denominator}"`;

                }

            } else {

                if (whole === 0) {

                    return `${feet}' ${numerator}/${denominator}"`;

                } else {

                    return `${feet}' ${whole} ${numerator}/${denominator}"`;

                }

            }

        }



        // 치수를 인치와 mm로 함께 표시

        function displayDimension(elementId, mmValue) {

            const element = document.getElementById(elementId);

            if (!element) return;

            

            const inchFraction = mmToInchFraction(mmValue);

            const mmRounded = Math.round(mmValue);

            

            element.innerHTML = `

                <div style="font-size: 2.5em; font-weight: 900; font-family: 'Nanum Myeongjo', serif; color: var(--primary); margin-bottom: 8px;">

                    ${inchFraction}

                </div>

                <div style="font-size: 0.85em; color: var(--text-light); font-weight: 600;">

                    (${mmRounded} mm)

                </div>

            `;

        }



        // 결과를 인치와 mm로 함께 표시

        function displayDualUnit(elementId, mmValue) {

            const element = document.getElementById(elementId);

            if (!element) return;

            

            const inchFraction = mmToInchFraction(mmValue);

            const mmRounded = Math.round(mmValue);

            

            element.innerHTML = `

                <span class="result-primary">${inchFraction}</span>

                <span class="result-secondary">(${mmRounded} mm)</span>

            `;

        }



        // 현재 단위 저장

        const units = {

            single: 'inch',

            double: 'inch'

        };



        // 탭 전환

        // 탭 전환 함수

        function switchTab(tab, element) {

            // 모든 탭과 콘텐츠에서 active 클래스 제거

            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

            document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));

            

            // 클릭한 탭과 해당 콘텐츠에 active 클래스 추가

            element.classList.add('active');

            document.getElementById(tab).classList.add('active');

        }



        // 단위 설정

        function setUnit(type, unit, event) {

            units[type] = unit;

            const buttons = document.querySelectorAll(`#${type} .unit-btn`);

            buttons.forEach(btn => {

                btn.classList.remove('active');

                // 버튼 텍스트로 단위 확인

                if ((unit === 'mm' && btn.textContent.includes('밀리미터')) ||

                    (unit === 'inch' && btn.textContent.includes('인치'))) {

                    btn.classList.add('active');

                }

            });

            

            // event가 있을 때만 (버튼 클릭 시)

            if (event && event.target) {

                buttons.forEach(btn => btn.classList.remove('active'));

                event.target.classList.add('active');

            }

            

            calculate(type);

        }



        // 방충망 다이어그램 그리기

                function drawScreenDiagram(type, positions, height) {

            const svg = document.getElementById(`screen-diagram-${type}`);

            // 가로 방향 설정

            const svgWidth = 1200;

            const svgHeight = 400;

            const padding = 80;

            const screenHeight = 180;

            const screenWidth = 1000;

            const screenX = padding + 60;

            const screenY = (svgHeight - screenHeight) / 2;

            

            const scale = screenWidth / height;

            

            let svgContent = '';

            

            if (type === 'single') {

                svgContent += `

                    <rect x="${screenX}" y="${screenY}" width="${screenWidth}" height="${screenHeight}" 

                          fill="none" stroke="#2C5F2D" stroke-width="6" rx="8"/>

                    

                    <defs>

                        <pattern id="mesh-pattern-h" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">

                            <line x1="0" y1="0" x2="0" y2="20" stroke="#D4A574" stroke-width="0.5" opacity="0.3"/>

                            <line x1="0" y1="0" x2="20" y2="0" stroke="#D4A574" stroke-width="0.5" opacity="0.3"/>

                        </pattern>

                    </defs>

                    <rect x="${screenX + 10}" y="${screenY + 10}" width="${screenWidth - 20}" height="${screenHeight - 20}" 

                          fill="url(#mesh-pattern-h)" opacity="0.5"/>

                    

                    <circle cx="${screenX + 60}" cy="${screenY - 5}" r="8" fill="#C84630" stroke="white" stroke-width="2"/>

                    <circle cx="${screenX + screenWidth - 60}" cy="${screenY - 5}" r="8" fill="#C84630" stroke="white" stroke-width="2"/>

                    

                    <rect x="${screenX + screenWidth/2 - 30}" y="${screenY + screenHeight - 8}" 

                          width="60" height="16" fill="#4A8B4D" stroke="white" stroke-width="2" rx="8"/>

                `;

            } else {

                const halfHeight = screenHeight / 2 - 5;

                

                svgContent += `

                    <rect x="${screenX}" y="${screenY}" width="${screenWidth}" height="${halfHeight}" 

                          fill="none" stroke="#2C5F2D" stroke-width="6" rx="8"/>

                    <rect x="${screenX + 10}" y="${screenY + 10}" width="${screenWidth - 20}" height="${halfHeight - 20}" 

                          fill="url(#mesh-pattern-h)" opacity="0.5"/>

                    

                    <rect x="${screenX}" y="${screenY + halfHeight + 10}" width="${screenWidth}" height="${halfHeight}" 

                          fill="none" stroke="#2C5F2D" stroke-width="6" rx="8"/>

                    <rect x="${screenX + 10}" y="${screenY + halfHeight + 20}" width="${screenWidth - 20}" height="${halfHeight - 20}" 

                          fill="url(#mesh-pattern-h)" opacity="0.5"/>

                    

                    <rect x="${screenX}" y="${screenY + halfHeight}" width="${screenWidth}" height="10" 

                          fill="#2C5F2D"/>

                    

                    <defs>

                        <pattern id="mesh-pattern-h" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">

                            <line x1="0" y1="0" x2="0" y2="20" stroke="#D4A574" stroke-width="0.5" opacity="0.3"/>

                            <line x1="0" y1="0" x2="20" y2="0" stroke="#D4A574" stroke-width="0.5" opacity="0.3"/>

                        </pattern>

                    </defs>

                    

                    <circle cx="${screenX + 60}" cy="${screenY - 5}" r="8" fill="#C84630" stroke="white" stroke-width="2"/>

                    <circle cx="${screenX + screenWidth - 60}" cy="${screenY - 5}" r="8" fill="#C84630" stroke="white" stroke-width="2"/>

                    <circle cx="${screenX + 60}" cy="${screenY + screenHeight + 5}" r="8" fill="#C84630" stroke="white" stroke-width="2"/>

                    <circle cx="${screenX + screenWidth - 60}" cy="${screenY + screenHeight + 5}" r="8" fill="#C84630" stroke="white" stroke-width="2"/>

                    

                    <rect x="${screenX + screenWidth/2 - 30}" y="${screenY + halfHeight - 5}" 

                          width="60" height="10" fill="#4A8B4D" stroke="white" stroke-width="2" rx="5"/>

                    <rect x="${screenX + screenWidth/2 - 30}" y="${screenY + halfHeight + 5}" 

                          width="60" height="10" fill="#4A8B4D" stroke="white" stroke-width="2" rx="5"/>

                `;

            }

            

            svgContent += `

                <line x1="${screenX}" y1="${screenY - 95}" x2="${screenX + screenWidth}" y2="${screenY - 95}" 

                      stroke="#2C5F2D" stroke-width="4"/>

                <line x1="${screenX}" y1="${screenY - 100}" x2="${screenX}" y2="${screenY - 90}" 

                      stroke="#2C5F2D" stroke-width="4"/>

                <line x1="${screenX + screenWidth}" y1="${screenY - 100}" x2="${screenX + screenWidth}" y2="${screenY - 90}" 

                      stroke="#2C5F2D" stroke-width="4"/>

                      

                <text x="${screenX + screenWidth/2}" y="${screenY - 115}" fill="#2C5F2D" font-size="16" font-weight="700" 

                      font-family="'Nanum Myeongjo', serif" text-anchor="middle">

                    총 길이: ${mmToInchFraction(height)}

                </text>

                <text x="${screenX + screenWidth/2}" y="${screenY - 100}" fill="#2C5F2D" font-size="13" font-weight="600" 

                      font-family="'Noto Sans KR', sans-serif" text-anchor="middle">

                    (${Math.round(height)} mm)

                </text>

            `;

            

            if (positions.length > 0) {

                const firstX = screenX + (positions[0] * scale);

                svgContent += `

                    <line x1="${screenX}" y1="${screenY - 30}" x2="${firstX}" y2="${screenY - 30}" 

                          stroke="#4A8B4D" stroke-width="2"/>

                    <line x1="${screenX}" y1="${screenY - 35}" x2="${screenX}" y2="${screenY - 25}" 

                          stroke="#4A8B4D" stroke-width="2"/>

                    <line x1="${firstX}" y1="${screenY - 35}" x2="${firstX}" y2="${screenY - 25}" 

                          stroke="#4A8B4D" stroke-width="2"/>

                    

                    <text x="${(screenX + firstX) / 2}" y="${screenY - 35}" fill="#4A8B4D" font-size="11" font-weight="600" 

                          font-family="'Noto Sans KR', sans-serif" text-anchor="middle">

                        ${mmToInchFraction(30)}

                    </text>

                `;

            }

            

            positions.forEach((pos, index) => {

                const actualX = screenX + (pos * scale);

                const circleNumbers = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮';

                

                svgContent += `

                    <circle cx="${actualX}" cy="${screenY + screenHeight/2}" r="8" fill="#C84630" stroke="white" stroke-width="3" opacity="0.9"/>

                    

                    <line x1="${actualX}" y1="${screenY}" x2="${actualX}" y2="${screenY + screenHeight}" 

                          stroke="#D4A574" stroke-width="1" stroke-dasharray="5,5" opacity="0.4"/>

                    

                    <line x1="${screenX}" y1="${screenY + screenHeight + 15}" x2="${actualX}" y2="${screenY + screenHeight + 15}" 

                          stroke="#6B6B6B" stroke-width="1" stroke-dasharray="3,3"/>

                    <line x1="${actualX}" y1="${screenY + screenHeight + 10}" x2="${actualX}" y2="${screenY + screenHeight + 50}" 

                          stroke="#2C5F2D" stroke-width="2"/>

                    

                    <polygon points="${screenX + 5},${screenY + screenHeight + 15} ${screenX + 10},${screenY + screenHeight + 12} ${screenX + 10},${screenY + screenHeight + 18}" 

                             fill="#2C5F2D"/>

                    <polygon points="${actualX - 5},${screenY + screenHeight + 15} ${actualX - 10},${screenY + screenHeight + 12} ${actualX - 10},${screenY + screenHeight + 18}" 

                             fill="#2C5F2D"/>

                    

                    <text x="${actualX}" y="${screenY + screenHeight + 65}" fill="#2C5F2D" font-size="16" font-weight="700" font-family="'Nanum Myeongjo', serif" text-anchor="middle">

                        ${circleNumbers.charAt(index)}

                    </text>

                    <text x="${actualX}" y="${screenY + screenHeight + 85}" fill="#6B6B6B" font-size="12" font-weight="600" font-family="'Noto Sans KR', sans-serif" text-anchor="middle">

                        ${mmToInchFraction(pos)} (${Math.round(pos)} mm)

                    </text>

                `;

                

                if (index < positions.length - 1) {

                    const nextX = screenX + (positions[index + 1] * scale);

                    const midX = (actualX + nextX) / 2;

                    const spacing = positions[index + 1] - pos;

                    

                    svgContent += `

                        <line x1="${actualX}" y1="${screenY - 60}" x2="${nextX}" y2="${screenY - 60}" 

                              stroke="#C84630" stroke-width="2"/>

                        <line x1="${actualX}" y1="${screenY - 65}" x2="${actualX}" y2="${screenY - 55}" 

                              stroke="#C84630" stroke-width="2"/>

                        <line x1="${nextX}" y1="${screenY - 65}" x2="${nextX}" y2="${screenY - 55}" 

                              stroke="#C84630" stroke-width="2"/>

                        

                        <text x="${midX}" y="${screenY - 65}" fill="#C84630" font-size="11" font-weight="600" 

                              font-family="'Noto Sans KR', sans-serif" text-anchor="middle">

                            간격: ${mmToInchFraction(spacing)} (${Math.round(spacing)} mm)

                        </text>

                    `;

                }

            });

            

            // 마지막 구멍부터 끝까지의 거리 표시 (30mm)

            if (positions.length > 0) {

                const lastX = screenX + (positions[positions.length - 1] * scale);

                const endX = screenX + screenWidth;

                svgContent += `

                    <!-- 마지막 구멍부터 끝까지 거리 (위쪽) -->

                    <line x1="${lastX}" y1="${screenY - 30}" x2="${endX}" y2="${screenY - 30}" 

                          stroke="#4A8B4D" stroke-width="2"/>

                    <line x1="${lastX}" y1="${screenY - 35}" x2="${lastX}" y2="${screenY - 25}" 

                          stroke="#4A8B4D" stroke-width="2"/>

                    <line x1="${endX}" y1="${screenY - 35}" x2="${endX}" y2="${screenY - 25}" 

                          stroke="#4A8B4D" stroke-width="2"/>

                    

                    <!-- 치수 -->

                    <text x="${(lastX + endX) / 2}" y="${screenY - 35}" fill="#4A8B4D" font-size="11" font-weight="600" 

                          font-family="'Noto Sans KR', sans-serif" text-anchor="middle">

                        ${mmToInchFraction(30)}

                    </text>

                `;

            }

            

            svg.innerHTML = svgContent;

        }



        // 망구멍 갯수 계산 (원본 로직)

        function calculateHoleCount(mesh20) {

            if (mesh20 <= 1000) return 4;

            if (mesh20 <= 1400) return 4;

            if (mesh20 <= 1600) return 6;

            if (mesh20 <= 2200) return 6;

            if (mesh20 <= 2400) return 6;

            if (mesh20 <= 2600) return 8;

            if (mesh20 <= 2900) return 8;

            if (mesh20 < 3200) return 8;

            return 8;

        }



        // 망구멍 위치 계산

        function calculateHolePositions(holeCount, spacing) {

            const positions = [];

            let currentPos = 30; // 첫 번째 구멍은 30mm

            

            for (let i = 0; i < holeCount; i++) {

                positions.push(currentPos);

                currentPos += spacing;

            }

            

            return positions;

        }



        // 망구멍 정보 표시

        function displayHoleInfo(type, mesh20mm) {

            const holeCount = calculateHoleCount(mesh20mm);

            const effectiveHeight = mesh20mm - 60;

            const spacing = Math.round(effectiveHeight / (holeCount - 1));

            

            // 망구멍 갯수 표시

            document.getElementById(`hole-count-${type}`).textContent = holeCount + '개';

            

            // 간격 표시 (인치 분수 + mm)

            const element = document.getElementById(`hole-spacing-${type}`);

            const inchFraction = mmToInchFraction(spacing);

            element.innerHTML = `

                <span class="result-primary">${inchFraction}</span>

                <span class="result-secondary">(${spacing} mm)</span>

            `;

            

            // 망구멍 위치 계산

            const positions = calculateHolePositions(holeCount, spacing);

            

            // 다이어그램 그리기

            drawScreenDiagram(type, positions, mesh20mm);

            

            // 망구멍 위치 리스트 표시

            const positionsContainer = document.getElementById(`hole-positions-${type}`);

            positionsContainer.innerHTML = '';

            

            positions.forEach((pos, index) => {

                const posItem = document.createElement('div');

                posItem.style.cssText = `

                    background: white;

                    padding: 12px;

                    border-radius: 10px;

                    border: 2px solid var(--border);

                    text-align: center;

                    transition: all 0.3s ease;

                `;

                

                const circleNumbers = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮';

                const inchFraction = mmToInchFraction(pos);

                posItem.innerHTML = `

                    <div style="font-weight: 700; color: var(--primary); font-size: 0.9em; margin-bottom: 5px;">

                        ${circleNumbers.charAt(index)}

                    </div>

                    <div style="font-weight: 700; color: var(--primary); font-size: 1.05em;">

                        ${inchFraction} <span style="font-size: 0.85em; color: var(--text-light);">(${Math.round(pos)} mm)</span>

                    </div>

                `;

                

                posItem.addEventListener('mouseenter', function() {

                    this.style.borderColor = 'var(--primary)';

                    this.style.transform = 'scale(1.05)';

                    this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';

                });

                

                posItem.addEventListener('mouseleave', function() {

                    this.style.borderColor = 'var(--border)';

                    this.style.transform = 'scale(1)';

                    this.style.boxShadow = 'none';

                });

                

                positionsContainer.appendChild(posItem);

            });

        }



        // 계산 함수 (외도어 편개형)

        function calculateSingle(width, height) {

            const results = {};

            

            // 알루미늄 프레임

            results.frameTop = width - 34;

            results.wallBar = height - 26;

            results.hingeBar = height - 42 + 2;

            results.handle = height - 101;

            

            // 망 / PVC / 실

            results.mesh20 = height - 38;

            results.pvc18 = height - 38;

            results.pvc29 = width - 40;

            

            // 실 계산 (mm 단위)

            results.string = (width + height + 120) * 2;

            

            // 실의 개수 계산 (망의 개수의 절반)

            const holeCount = calculateHoleCount(results.mesh20);

            results.stringCount = Math.round(holeCount / 2);

            

            // 면적 (SF) - 인치로 변환 필요

            const widthInch = width / 25.4;

            const heightInch = height / 25.4;

            results.area = (widthInch * heightInch / 144).toFixed(2);

            

            return results;

        }



        // 계산 함수 (양개형)

        function calculateDouble(width, height) {

            const results = {};

            

            // 각 문짝의 가로 길이

            const halfWidth = (width - 20) / 2;

            

            // 알루미늄 프레임

            results.frameTop = width - 34;  // 양개형 상/하 프레임 = 전체 가로 - 34

            results.middleBar = height - 50;

            results.wallBar = height - 26;

            results.hingeBar = height - 42 + 2;

            results.handle = height - 101;

            

            // 망 / PVC / 실

            results.mesh20 = height - 38;

            results.pvc18 = height - 38;

            results.pvc29 = halfWidth - 22;

            

            // 실 계산 (mm 단위)

            results.stringInner = width + height + 40;  // 내부실 길이 (전체 넓이 + 전체 높이 + 40)

            results.stringOuter = results.stringInner * 2;  // 외부실 길이 = 내부실의 2배

            

            // 실의 개수 계산 (양개형)

            const holeCount = calculateHoleCount(results.mesh20);

            results.stringCountInner = holeCount - 2; // 내부실 = 망구멍 - 2

            results.stringCountOuter = 2; // 외부실 = 항상 2개

            

            // 면적 (SF) - 전체

            const totalWidthInch = width / 25.4;

            const heightInch = height / 25.4;

            results.area = (totalWidthInch * heightInch / 144).toFixed(2);

            

            return results;

        }



        // 메인 계산 함수

        function calculate(type) {

            let width = parseFloat(document.getElementById(`width-${type}`).value);

            let height = parseFloat(document.getElementById(`height-${type}`).value);

            

            if (!width || !height) return;

            

            // 인치를 mm로 변환

            if (units[type] === 'inch') {

                width = width * 25.4;

                height = height * 25.4;

            }

            

            // 치수 표시 (인치 분수 + mm) - 각 타입에 맞게 표시

            displayDimension(`width-display-${type}`, width);

            displayDimension(`height-display-${type}`, height);

            

            let results;

            

            if (type === 'single') {

                results = calculateSingle(width, height);

                

                // 결과 표시 (인치 분수 + mm)

                displayDualUnit('frame-top-single', results.frameTop);

                displayDualUnit('wall-bar-single', results.wallBar);

                displayDualUnit('hinge-bar-single', results.hingeBar);

                displayDualUnit('handle-single', results.handle);

                displayDualUnit('mesh-20-single', results.mesh20);

                

                // 망접힘 갯수 계산 (가로넓이(mm) / 1000 * 36)

                const meshFoldCount = Math.round((width / 1000) * 36);

                const meshFoldElement = document.getElementById('mesh-fold-single');

                if (meshFoldElement) {

                    meshFoldElement.innerHTML = `<span style="font-size: 1.2em; font-weight: 600;">${meshFoldCount}개</span>`;

                }

                

                // Privacy Screen 두께 계산 (가로넓이(mm) / 10000 * 20)

                const privacyScreenCm = (width / 10000) * 20;

                const privacyScreenInch = privacyScreenCm / 2.54;

                const privacyScreenInchFraction = inchToFraction(privacyScreenInch);

                const privacyScreenElement = document.getElementById('privacy-screen-single');

                if (privacyScreenElement) {

                    privacyScreenElement.innerHTML = `

                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">

                            <span style="font-size: 1.2em; font-weight: 600;">${privacyScreenInchFraction}"</span>

                            <span style="font-size: 0.9em; color: var(--text-light);">${privacyScreenCm.toFixed(2)} cm</span>

                        </div>

                    `;

                }

                

                displayDualUnit('pvc-18-single', results.pvc18);

                displayDualUnit('pvc-29-single', results.pvc29);

                

                // 실은 인치 분수로 표시 (피트와 인치 형식)

                const stringMm = results.string;

                const stringInches = stringMm / 25.4;

                const stringFeet = Math.floor(stringInches / 12);

                const stringRemainingInches = stringInches - (stringFeet * 12);

                const stringWholeInch = Math.floor(stringRemainingInches);

                const stringDecimal = stringRemainingInches - stringWholeInch;

                const stringSixteenths = Math.round(stringDecimal * 16);

                

                let stringDisplay = `${stringFeet}' ${stringWholeInch}"`;

                if (stringSixteenths > 0 && stringSixteenths < 16) {

                    // 분수 간소화

                    let num = stringSixteenths;

                    let den = 16;

                    const divisor = calculateGCD(num, den);

                    num /= divisor;

                    den /= divisor;

                    stringDisplay += ` ${num}/${den}`;

                } else if (stringSixteenths === 16) {

                    stringDisplay = `${stringFeet}' ${stringWholeInch + 1}"`;

                }

                

                const stringElement = document.getElementById('string-single');

                if (stringElement) {

                    stringElement.innerHTML = `

                        <span class="result-primary">${stringDisplay}</span>

                        <span class="result-secondary">(${Math.round(stringMm)} mm)</span>

                    `;

                }

                

                // 실의 개수 표시

                const stringCountElement = document.getElementById('string-count-single');

                if (stringCountElement) {

                    stringCountElement.innerHTML = `

                        <span class="result-primary">${results.stringCount}개</span>

                    `;

                }

                

                // 면적 표시 (SF와 SM)

                document.getElementById('area-display-single').textContent = results.area;

                document.getElementById('area-sm-display-single').textContent = (results.area * 0.092903).toFixed(2);

                

                // 망구멍 정보 표시

                displayHoleInfo('single', results.mesh20);

            } else {

                results = calculateDouble(width, height);

                

                // 결과 표시 (인치 분수 + mm)

                displayDualUnit('frame-top-double', results.frameTop);

                displayDualUnit('middle-bar-double', results.middleBar);

                displayDualUnit('wall-bar-double', results.wallBar);

                displayDualUnit('hinge-bar-double', results.hingeBar);

                displayDualUnit('handle-double', results.handle);

                displayDualUnit('mesh-20-double', results.mesh20);

                

                // 망접힘 갯수 계산 (전체 가로(mm) / 1000 * 36)

                const meshFoldCount = Math.round((width / 1000) * 36);

                const meshFoldElement = document.getElementById('mesh-fold-double');

                if (meshFoldElement) {

                    meshFoldElement.innerHTML = `<span style="font-size: 1.2em; font-weight: 600;">${meshFoldCount}개</span>`;

                }

                

                // Privacy Screen 두께 계산 (전체 가로(mm) / 10000 * 20)

                const privacyScreenCm = (width / 10000) * 20;

                const privacyScreenInch = privacyScreenCm / 2.54;

                const privacyScreenInchFraction = inchToFraction(privacyScreenInch);

                const privacyScreenElement = document.getElementById('privacy-screen-double');

                if (privacyScreenElement) {

                    privacyScreenElement.innerHTML = `

                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">

                            <span style="font-size: 1.2em; font-weight: 600;">${privacyScreenInchFraction}"</span>

                            <span style="font-size: 0.9em; color: var(--text-light);">${privacyScreenCm.toFixed(2)} cm</span>

                        </div>

                    `;

                }

                

                displayDualUnit('pvc-18-double', results.pvc18);

                displayDualUnit('pvc-29-double', results.pvc29);

                

                // 내부실 길이 표시

                const stringInnerMm = results.stringInner;

                const stringInnerInches = stringInnerMm / 25.4;

                const stringInnerFeet = Math.floor(stringInnerInches / 12);

                const stringInnerRemainingInches = stringInnerInches - (stringInnerFeet * 12);

                const stringInnerWholeInch = Math.floor(stringInnerRemainingInches);

                const stringInnerDecimal = stringInnerRemainingInches - stringInnerWholeInch;

                const stringInnerSixteenths = Math.round(stringInnerDecimal * 16);

                

                let stringInnerDisplay = `${stringInnerFeet}' ${stringInnerWholeInch}"`;

                if (stringInnerSixteenths > 0 && stringInnerSixteenths < 16) {

                    // 분수 간소화

                    let num = stringInnerSixteenths;

                    let den = 16;

                    const divisor = calculateGCD(num, den);

                    num /= divisor;

                    den /= divisor;

                    stringInnerDisplay += ` ${num}/${den}`;

                } else if (stringInnerSixteenths === 16) {

                    stringInnerDisplay = `${stringInnerFeet}' ${stringInnerWholeInch + 1}"`;

                }

                

                const stringInnerElement = document.getElementById('string-inner-double');

                if (stringInnerElement) {

                    stringInnerElement.innerHTML = `

                        <span class="result-primary">${stringInnerDisplay}</span>

                        <span class="result-secondary">(${Math.round(stringInnerMm)} mm)</span>

                    `;

                }

                

                // 외부실 길이 표시

                const stringOuterMm = results.stringOuter;

                const stringOuterInches = stringOuterMm / 25.4;

                const stringOuterFeet = Math.floor(stringOuterInches / 12);

                const stringOuterRemainingInches = stringOuterInches - (stringOuterFeet * 12);

                const stringOuterWholeInch = Math.floor(stringOuterRemainingInches);

                const stringOuterDecimal = stringOuterRemainingInches - stringOuterWholeInch;

                const stringOuterSixteenths = Math.round(stringOuterDecimal * 16);

                

                let stringOuterDisplay = `${stringOuterFeet}' ${stringOuterWholeInch}"`;

                if (stringOuterSixteenths > 0 && stringOuterSixteenths < 16) {

                    // 분수 간소화

                    let num = stringOuterSixteenths;

                    let den = 16;

                    const divisor = calculateGCD(num, den);

                    num /= divisor;

                    den /= divisor;

                    stringOuterDisplay += ` ${num}/${den}`;

                } else if (stringOuterSixteenths === 16) {

                    stringOuterDisplay = `${stringOuterFeet}' ${stringOuterWholeInch + 1}"`;

                }

                

                const stringOuterElement = document.getElementById('string-outer-double');

                if (stringOuterElement) {

                    stringOuterElement.innerHTML = `

                        <span class="result-primary">${stringOuterDisplay}</span>

                        <span class="result-secondary">(${Math.round(stringOuterMm)} mm)</span>

                    `;

                }

                

                // 내부실 개수 표시

                const stringCountInnerElement = document.getElementById('string-count-inner-double');

                if (stringCountInnerElement) {

                    stringCountInnerElement.innerHTML = `

                        <span class="result-primary">${results.stringCountInner}개</span>

                    `;

                }

                

                // 외부실 개수 표시

                const stringCountOuterElement = document.getElementById('string-count-outer-double');

                if (stringCountOuterElement) {

                    stringCountOuterElement.innerHTML = `

                        <span class="result-primary">${results.stringCountOuter}개</span>

                    `;

                }

                

                // 면적 표시 (SF와 SM)

                document.getElementById('area-display-double').textContent = results.area;

                document.getElementById('area-sm-display-double').textContent = (results.area * 0.092903).toFixed(2);

                

                // 망구멍 정보 표시

                displayHoleInfo('double', results.mesh20);

            }

        }



        // 수동 저장 함수

        function manualSaveCalculation(type) {

            const widthInput = document.getElementById(`width-${type}`);

            const heightInput = document.getElementById(`height-${type}`);

            

            if (!widthInput.value || !heightInput.value) {

                alert('가로와 세로 크기를 먼저 입력하고 계산해주세요.');

                return;

            }



            const width = parseFloat(widthInput.value);

            const height = parseFloat(heightInput.value);



            // 현재 단위 확인

            const currentUnit = document.querySelector(`#${type} .unit-btn.active`).textContent.includes('inch') ? 'inch' : 'mm';

            

            // 인치로 변환

            let widthInch = width;

            let heightInch = height;

            let widthMm = width;

            let heightMm = height;

            

            if (currentUnit === 'mm') {

                widthInch = width / 25.4;

                heightInch = height / 25.4;

            } else {

                widthMm = width * 25.4;

                heightMm = height * 25.4;

            }



            // 고객 정보 수집

            const customerInfo = {

                date: document.getElementById(`date-${type}`).value || '',

                customer: document.getElementById(`customer-${type}`).value || '',

                address: document.getElementById(`address-${type}`).value || '',

                location: document.getElementById(`location-${type}`).value || '',

                email: document.getElementById(`email-${type}`).value || '',

                phone: document.getElementById(`phone-${type}`).value || '',

                frameColor: document.getElementById(`frame-color-${type}`).value || '',

                meshColor: document.getElementById(`mesh-color-${type}`).value || ''

            };



            // 계산 실행

            const results = type === 'single' ? calculateSingle(widthMm, heightMm) : calculateDouble(widthMm, heightMm);



            // 온라인 저장

            saveToGoogleSheets(type, widthInch, heightInch, customerInfo, results)

                .then(result => {

                    if (result.success) {

                        alert('✅ 계산 결과가 온라인에 저장되었습니다!');

                        console.log('✅ Google Sheets 저장 완료');

                        // 저장 후 목록 새로고침

                        loadOnlineCalculations();

                    } else {

                        alert('❌ 저장에 실패했습니다: ' + (result.error || '알 수 없는 오류'));

                    }

                })

                .catch(error => {

                    alert('❌ 저장 중 오류가 발생했습니다: ' + error.message);

                    console.error('저장 실패:', error);

                });

        }



        // 주문서 출력

        function printOrder(type) {

            const customer = document.getElementById(`customer-${type}`).value;

            const date = document.getElementById(`date-${type}`).value;

            

            if (!customer) {

                alert('고객명을 입력해주세요.');

                return;

            }

            

            window.print();

        }



        // 폼 초기화

        function resetForm(type) {

            document.getElementById(`date-${type}`).value = '';

            document.getElementById(`customer-${type}`).value = '';

            document.getElementById(`address-${type}`).value = '';

            document.getElementById(`location-${type}`).value = '';

            document.getElementById(`email-${type}`).value = '';

            document.getElementById(`phone-${type}`).value = '';

            document.getElementById(`width-${type}`).value = '';

            document.getElementById(`height-${type}`).value = '';

            document.getElementById(`frame-color-${type}`).value = '';

            document.getElementById(`mesh-color-${type}`).value = '';

            

            // 결과 초기화

            document.querySelectorAll(`#${type} .result-value-dual`).forEach(el => {

                el.innerHTML = '<span class="result-primary">-</span>';

            });

            document.querySelectorAll(`#${type} .info-number`).forEach(el => {

                el.innerHTML = '<div style="font-size: 2.5em;">-</div>';

            });

            

            // 면적 초기화

            const widthDisplay = document.getElementById(`width-display-${type}`);

            const heightDisplay = document.getElementById(`height-display-${type}`);

            const areaDisplay = document.getElementById(`area-display-${type}`);

            const areaSmDisplay = document.getElementById(`area-sm-display-${type}`);

            

            if (widthDisplay) widthDisplay.innerHTML = '<div style="font-size: 2.5em;">-</div>';

            if (heightDisplay) heightDisplay.innerHTML = '<div style="font-size: 2.5em;">-</div>';

            if (areaDisplay) areaDisplay.textContent = '-';

            if (areaSmDisplay) areaSmDisplay.textContent = '-';

        }



        // 저장 내역 모달 열기

        function showSavedCalculations() {

            // 온라인 데이터 새로고침

            loadOnlineCalculations()

                .then(() => {

                    const modal = document.getElementById('savedCalculationsModal');

                    

                    // 검색 및 필터 초기화

                    document.getElementById('searchInput').value = '';

                    document.getElementById('sortSelect').value = 'date-desc';

                    document.getElementById('typeFilter').value = 'all';

                    

                    filterCalculations();

                    modal.style.display = 'block';

                })

                .catch(error => {

                    console.error('저장 내역 불러오기 실패:', error);

                    alert('저장 내역을 불러올 수 없습니다.');

                });

        }



        // 필터링 및 정렬 함수

        function filterCalculations() {

            const searchTerm = document.getElementById('searchInput').value.toLowerCase();

            const sortOption = document.getElementById('sortSelect').value;

            const typeFilter = document.getElementById('typeFilter').value;

            const list = document.getElementById('savedCalculationsList');



            console.log('📊 전체 데이터 개수:', allCalculationsCache.length);

            if (allCalculationsCache.length > 0) {

                console.log('📋 첫 번째 데이터 샘플:', allCalculationsCache[0]);

            }



            if (allCalculationsCache.length === 0) {

                list.innerHTML = '<p style="text-align: center; color: #999; padding: 50px;">저장된 계산 내역이 없습니다.</p>';

                return;

            }



            // 필터링

            let filtered = allCalculationsCache.filter(calc => {

                // 타입 필터

                if (typeFilter !== 'all' && calc.type !== typeFilter) {

                    return false;

                }



                // 검색어 필터

                if (searchTerm) {

                    const customer = (calc.customer || '').toLowerCase();

                    const address = (calc.address || '').toLowerCase();

                    const location = (calc.location || '').toLowerCase();

                    const email = (calc.email || '').toLowerCase();

                    const phone = (calc.phone || '').toLowerCase();

                    

                    return customer.includes(searchTerm) || 

                           address.includes(searchTerm) || 

                           location.includes(searchTerm) ||

                           email.includes(searchTerm) || 

                           phone.includes(searchTerm);

                }

                

                return true;

            });



            // 정렬

            filtered.sort((a, b) => {

                switch(sortOption) {

                    case 'date-desc':

                        return new Date(b.timestamp) - new Date(a.timestamp);

                    case 'date-asc':

                        return new Date(a.timestamp) - new Date(b.timestamp);

                    case 'customer-asc':

                        return (a.customer || '').localeCompare(b.customer || '');

                    case 'customer-desc':

                        return (b.customer || '').localeCompare(a.customer || '');

                    case 'width-desc':

                        return (b.widthInch || 0) - (a.widthInch || 0);

                    case 'width-asc':

                        return (a.widthInch || 0) - (b.widthInch || 0);

                    default:

                        return 0;

                }

            });



            // 결과 표시

            if (filtered.length === 0) {

                list.innerHTML = '<p style="text-align: center; color: #999; padding: 50px;">검색 결과가 없습니다.</p>';

            } else {

                list.innerHTML = filtered.map(calc => `

                    <div style="border: 2px solid var(--primary); border-radius: 10px; padding: 15px; margin-bottom: 15px; background: #f9f9f9;">

                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">

                            <div style="flex: 1;">

                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">

                                    <strong style="font-size: 16px; color: var(--primary);">

                                        ${calc.type === 'single' ? '📏 외도어 편개형' : '📐 양개형'}

                                    </strong>

                                    ${calc.customer ? `<span style="background: #e3f2fd; padding: 3px 10px; border-radius: 5px; font-size: 13px; color: #1976d2;">👤 ${calc.customer}</span>` : ''}

                                </div>

                                <div style="color: #666; font-size: 13px;">

                                    📅 ${new Date(calc.timestamp).toLocaleString('ko-KR')}

                                </div>

                                ${calc.address ? `<div style="color: #666; font-size: 13px; margin-top: 3px;">📍 ${calc.address}</div>` : ''}

                                ${calc.location ? `<div style="color: #666; font-size: 13px; margin-top: 3px;">🏠 ${calc.location}</div>` : ''}

                                ${calc.phone ? `<div style="color: #666; font-size: 13px; margin-top: 3px;">📞 ${calc.phone}</div>` : ''}

                                ${calc.email ? `<div style="color: #666; font-size: 13px; margin-top: 3px;">📧 ${calc.email}</div>` : ''}

                            </div>

                            <button onclick="deleteCalculation(${calc.id}).then(() => { getAllCalculations().then(c => { allCalculationsCache = c; filterCalculations(); }); })" 

                                    style="background: #dc3545; color: white; border: none; padding: 5px 15px; border-radius: 5px; cursor: pointer;">

                                삭제

                            </button>

                        </div>

                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 14px; background: white; padding: 10px; border-radius: 8px;">

                            <div><strong>가로:</strong> ${(calc.widthInch || 0).toFixed(2)}"</div>

                            <div><strong>세로:</strong> ${(calc.heightInch || 0).toFixed(2)}"</div>

                            <div><strong>면적:</strong> ${calc.results?.area || '-'} SF</div>

                            <div><strong>프레임 색상:</strong> ${calc.frameColor || '-'}</div>

                            <div><strong>망 색상:</strong> ${calc.meshColor || '-'}</div>

                            <div><strong>날짜:</strong> ${calc.date || '-'}</div>

                        </div>

                        <button onclick="console.log('🔘 불러오기 버튼 클릭됨, ID:', ${calc.id}); loadCalculation(${calc.id})" 

                                style="margin-top: 10px; width: 100%; padding: 8px; background: var(--primary); color: white; border: none; border-radius: 5px; cursor: pointer;">

                            📋 불러오기

                        </button>

                    </div>

                `).join('');

            }

        }



        // 저장 내역 모달 닫기

        function closeSavedCalculationsModal() {

            document.getElementById('savedCalculationsModal').style.display = 'none';

        }



        // 저장된 계산 불러오기

        function loadCalculation(id) {

            console.log('🔄 불러오기 시도 - ID:', id);

            console.log('📦 캐시 크기:', allCalculationsCache.length);

            

            // 캐시된 데이터 사용

            if (allCalculationsCache.length > 0) {

                const calc = allCalculationsCache.find(c => c.id === id);

                console.log('📋 찾은 데이터:', calc);

                

                if (calc) {

                    try {

                        // 탭 전환

                        const tabs = document.querySelectorAll('.tab');

                        const targetTab = calc.type === 'single' ? tabs[0] : tabs[1];

                        switchTab(calc.type, targetTab);

                        

                        // 약간의 지연 후 데이터 설정 (탭 전환 완료 대기)

                        setTimeout(() => {

                            // 인치 단위로 설정

                            setUnit(calc.type, 'inch');

                            

                            // 입력값 설정

                            const widthValue = calc.widthInch || (calc.width ? calc.width / 25.4 : 0);

                            const heightValue = calc.heightInch || (calc.height ? calc.height / 25.4 : 0);

                            

                            document.getElementById(`width-${calc.type}`).value = widthValue.toFixed(2);

                            document.getElementById(`height-${calc.type}`).value = heightValue.toFixed(2);

                            

                            // 고객 정보 복원

                            if (calc.customer) document.getElementById(`customer-${calc.type}`).value = calc.customer;

                            if (calc.date) document.getElementById(`date-${calc.type}`).value = calc.date;

                            if (calc.address) document.getElementById(`address-${calc.type}`).value = calc.address;

                            if (calc.location) document.getElementById(`location-${calc.type}`).value = calc.location;

                            if (calc.email) document.getElementById(`email-${calc.type}`).value = calc.email;

                            if (calc.phone) document.getElementById(`phone-${calc.type}`).value = calc.phone;

                            if (calc.frameColor) document.getElementById(`frame-color-${calc.type}`).value = calc.frameColor;

                            if (calc.meshColor) document.getElementById(`mesh-color-${calc.type}`).value = calc.meshColor;

                            

                            // 계산 실행

                            calculate(calc.type);

                            

                            // 모달 닫기

                            closeSavedCalculationsModal();

                            

                            alert('✅ 계산 내역을 불러왔습니다.');

                        }, 100);

                        

                    } catch (error) {

                        console.error('❌ 데이터 복원 중 에러:', error);

                        alert('❌ 데이터 복원 중 오류가 발생했습니다: ' + error.message);

                    }

                } else {

                    alert('❌ 해당 ID의 데이터를 찾을 수 없습니다.');

                }

            } else {

                // 캐시가 없으면 DB에서 직접 가져오기

                getAllCalculations()

                    .then(calculations => {

                        allCalculationsCache = calculations;

                        const calc = calculations.find(c => c.id === id);

                        

                        if (calc) {

                            // 위와 동일한 처리

                            const tabs = document.querySelectorAll('.tab');

                            const targetTab = calc.type === 'single' ? tabs[0] : tabs[1];

                            switchTab(calc.type, targetTab);

                            

                            setTimeout(() => {

                                setUnit(calc.type, 'inch');

                                

                                const widthValue = calc.widthInch || (calc.width ? calc.width / 25.4 : 0);

                                const heightValue = calc.heightInch || (calc.height ? calc.height / 25.4 : 0);

                                

                                document.getElementById(`width-${calc.type}`).value = widthValue.toFixed(2);

                                document.getElementById(`height-${calc.type}`).value = heightValue.toFixed(2);

                                

                                if (calc.customer) document.getElementById(`customer-${calc.type}`).value = calc.customer;

                                if (calc.date) document.getElementById(`date-${calc.type}`).value = calc.date;

                                if (calc.address) document.getElementById(`address-${calc.type}`).value = calc.address;

                                if (calc.location) document.getElementById(`location-${calc.type}`).value = calc.location;

                                if (calc.email) document.getElementById(`email-${calc.type}`).value = calc.email;

                                if (calc.phone) document.getElementById(`phone-${calc.type}`).value = calc.phone;

                                if (calc.frameColor) document.getElementById(`frame-color-${calc.type}`).value = calc.frameColor;

                                if (calc.meshColor) document.getElementById(`mesh-color-${calc.type}`).value = calc.meshColor;

                                

                                calculate(calc.type);

                                closeSavedCalculationsModal();

                                alert('✅ 계산 내역을 불러왔습니다.');

                            }, 100);

                        } else {

                            alert('❌ 계산 내역을 찾을 수 없습니다.');

                        }

                    })

                    .catch(error => {

                        console.error('❌ 계산 불러오기 실패:', error);

                        alert('❌ 계산을 불러올 수 없습니다: ' + error.message);

                    });

            }

        }



        // 오늘 날짜 자동 설정

        window.onload = function() {

            const today = new Date().toISOString().split('T')[0];

            document.getElementById('date-single').value = today;

            document.getElementById('date-double').value = today;

            

            // 샘플 데이터로 다이어그램 표시 (외도어 편개형)

            const samplePositions = [30, 316, 602, 888, 1173, 1459];

            const sampleHeight = 1800;

            drawScreenDiagram('single', samplePositions, sampleHeight);

 