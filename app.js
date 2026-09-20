// ==========================================
// 1. ПЕРЕМЕННЫЕ СОСТОЯНИЯ И БАЗА ДАННЫХ КНИГ
// ==========================================
let isSignUp = false;
let currentUser = null;
let selectedBookForOrder = null;
let selectedOptionType = 'buy'; 
let searchQuery = '';

const defaultBooks = [
    { 
        id: 1, 
        title: "Алые паруса", 
        author: "Александр Грин", 
        price: 340,
        colorClass: "cover-red",
        annotation: "Трогательная и вдохновляющая история о том, что настоящие чудеса нужно делать своими руками. Если вы верите в чистую мечту, несмотря на насмешки окружающих, судьба обязательно приведет к вашему берегу корабль под алыми парусами."
    },
    { 
        id: 2, 
        title: "Барышня-крестьянка", 
        author: "Александр Пушкин", 
        price: 280,
        colorClass: "cover-blue",
        annotation: "Очаровательная, легкая и остроумная романтическая комедия. Что делать, если отцы двух семейств враждуют, а познакомиться с симпатичным молодым соседом очень хочется? Дочь помещика придумывает дерзкий план со сменой наряда."
    },
    { 
        id: 3, 
        title: "Повести Белкина (Метель)", 
        author: "Александр Пушкин", 
        price: 320,
        colorClass: "cover-green",
        annotation: "Удивительная история о превратностях судьбы, роковой ошибке и настоящем романтическом чуде. Загадочное стечение обстоятельств в заснеженную ночь полностью меняет жизни главных героев."
    },
    { 
        id: 4, 
        title: "Двенадцать стульев", 
        author: "Илья Ильф, Евгений Петров", 
        price: 420,
        colorClass: "cover-gold",
        annotation: "Легендарный сатирический роман, который давно разошелся на цитаты. Приключения гениального комбинатора Остапа Бендера и его напарника Кисы Воробьянинова в погоне за спрятанными бриллиантами."
    },
    { 
        id: 5, 
        title: "Человек-амфибия", 
        author: "Александр Беляев", 
        price: 360,
        colorClass: "cover-purple",
        annotation: "Захватывающий научно-фантастический роман о загадочном юноше, способном жить под водой, и его знакомстве с миром людей. Океанские глубины, коварные интриги, преданная дружба и искренняя любовь."
    },
    { 
        id: 6, 
        title: "Руслан и Людмила", 
        author: "Александр Пушкин", 
        price: 290,
        colorClass: "cover-red",
        annotation: "Волшебная поэма, полная динамичных приключений, тайн и юмора. Храброму витязю предстоит отправиться в опасный путь, чтобы спасти свою похищенную прямо со свадьбы невесту."
    }
];

let cachedBooks = localStorage.getItem('books');
if (cachedBooks) {
    try {
        let parsed = JSON.parse(cachedBooks);
        if (parsed.length > 0 && !parsed[0].colorClass) {
            localStorage.removeItem('books');
        }
    } catch(e) {
        localStorage.removeItem('books');
    }
}

let books = JSON.parse(localStorage.getItem('books')) || defaultBooks;
let users = JSON.parse(localStorage.getItem('users')) || [];

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

function calculateRentPrices(basePrice) {
    return {
        buy: basePrice,
        rent_2w: Math.round(basePrice * 0.25),
        rent_1m: Math.round(basePrice * 0.40),
        rent_3m: Math.round(basePrice * 0.65)
    };
}

function handleSearch() {
    searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    renderBooks();
}

// Рендеринг витрины для клиентов
function renderBooks() {
    const grid = document.getElementById('booksGrid');
    if (!grid) return;
    
    const filteredBooks = books.filter(book => 
        book.title.toLowerCase().includes(searchQuery) || 
        book.author.toLowerCase().includes(searchQuery)
    );

    if (filteredBooks.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px;">Ничего не найдено по вашему запросу</p>';
        return;
    }

    grid.innerHTML = filteredBooks.map(book => `
        <div class="card">
            <div class="card-cover ${book.colorClass || 'cover-blue'}">
                <div class="cover-title">${book.title}</div>
                <div class="cover-author">${book.author}</div>
                <div class="cover-decor">📜</div>
            </div>
            <div class="card-title">${book.title}</div>
            <div class="card-author">${book.author}</div>
            <div class="card-price">от ${Math.round(book.price * 0.25)} ₽</div>
            <div class="card-buttons">
                <button class="btn btn-info" onclick="openAnnotationModal(${book.id})">Аннотация</button>
                <button class="btn btn-primary" onclick="openOrderModal(${book.id})">Купить / Аренда</button>
            </div>
        </div>
    `).join('');
}

// Рендеринг таблицы книг внутри админ-панели
function renderAdminTable() {
    const tbody = document.getElementById('adminBooksTableBody');
    if (!tbody) return;

    tbody.innerHTML = books.map(book => `
        <tr>
            <td><span class="mini-cover ${book.colorClass || 'cover-blue'}"></span></td>
            <td><strong>${book.title}</strong></td>
            <td>${book.author}</td>
            <td>${book.price} ₽</td>
            <td>
                <button class="btn btn-edit" onclick="startEditBook(${book.id})">Редактировать</button>
                <button class="btn btn-danger" onclick="deleteBookFromCatalog(${book.id})">Удалить</button>
            </td>
        </tr>
    `).join('');
}


// ==========================================
// 2. ИНТЕРФЕЙС АДМИНИСТРАТОРА (ДОБАВЛЕНИЕ / ИЗМЕНЕНИЕ / УДАЛЕНИЕ)
// ==========================================

// Перехват отправки формы (Создание или Обновление)
function handleBookSubmit(e) {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') return;

    const editId = document.getElementById('editBookId').value;
    const title = document.getElementById('newTitle').value;
    const author = document.getElementById('newAuthor').value;
    const price = parseInt(document.getElementById('newPrice').value);
    const colorClass = document.getElementById('newColor').value;
    const annotation = document.getElementById('newAnnotation').value;

    if (editId) {
        // РЕЖИМ РЕДАКТИРОВАНИЯ
        books = books.map(book => {
            if (book.id === parseInt(editId)) {
                return { ...book, title, author, price, colorClass, annotation };
            }
            return book;
        });
        showToast(`Книга «${title}» успешно обновлена!`);
    } else {
        // РЕЖИМ СОЗДАНИЯ
        const newBook = { id: Date.now(), title, author, price, colorClass, annotation };
        books.push(newBook);
        showToast(`Книга «${title}» добавлена в каталог!`);
    }

    localStorage.setItem('books', JSON.stringify(books));
    renderBooks();
    renderAdminTable();
    resetAdminForm();
}

// Запуск редактирования — заполнение полей формы данными выбранной книги
function startEditBook(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    document.getElementById('editBookId').value = book.id;
    document.getElementById('newTitle').value = book.title;
    document.getElementById('newAuthor').value = book.author;
    document.getElementById('newPrice').value = book.price;
    document.getElementById('newColor').value = book.colorClass || 'cover-blue';
    document.getElementById('newAnnotation').value = book.annotation || '';

    // Переключаем заголовки и кнопки интерфейса
    document.getElementById('adminPanelTitle').textContent = "📝 Редактирование книги";
    document.getElementById('adminSubmitBtn').textContent = "Сохранить изменения";
    document.getElementById('cancelEditBtn').style.display = "inline-block";
    
    // Скроллим админа к форме редактирования
    document.getElementById('addBookForm').scrollIntoView({ behavior: 'smooth' });
}

// Удаление книги из каталога
function deleteBookFromCatalog(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    if (confirm(`Вы уверены, что хотите навсегда удалить книгу «${book.title}» из магазина?`)) {
        books = books.filter(b => b.id !== bookId);
        localStorage.setItem('books', JSON.stringify(books));
        renderBooks();
        renderAdminTable();
        showToast('Книга удалена из каталога.');
    }
}

// Сброс формы администратора в исходное состояние
function resetAdminForm() {
    document.getElementById('addBookForm').reset();
    document.getElementById('editBookId').value = "";
    document.getElementById('adminPanelTitle').textContent = "🛠️ Добавить новую книгу в каталог";
    document.getElementById('adminSubmitBtn').textContent = "Добавить на витрину";
    document.getElementById('cancelEditBtn').style.display = "none";
}


// ==========================================
// 3. ОКНА ЗАКАЗА, АННОТАЦИЙ И ПОЛКИ ПОКУПАТЕЛЯ
// ==========================================
function openOrderModal(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    selectedBookForOrder = book;
    selectedOptionType = 'buy';

    document.getElementById('orderBookTitle').textContent = book.title;
    document.getElementById('orderBookAuthor').textContent = book.author;

    const rates = calculateRentPrices(book.price);
    document.getElementById('priceBuy').textContent = `${rates.buy} ₽`;
    document.getElementById('price2w').textContent = `${rates.rent_2w} ₽`;
    document.getElementById('price1m').textContent = `${rates.rent_1m} ₽`;
    document.getElementById('price3m').textContent = `${rates.rent_3m} ₽`;

    const optionCards = document.querySelectorAll('.order-option-card');
    optionCards.forEach(c => c.classList.remove('active'));
    if(optionCards.length > 0) optionCards[0].classList.add('active');

    document.getElementById('orderModal').style.display = 'flex';
}

function selectOrderOption(type, element) {
    selectedOptionType = type;
    const optionCards = document.querySelectorAll('.order-option-card');
    optionCards.forEach(c => c.classList.remove('active'));
    element.classList.add('active');
}

function closeOrderModal() {
    document.getElementById('orderModal').style.display = 'none';
    selectedBookForOrder = null;
}

function confirmOrder() {
    if (!currentUser) {
        closeOrderModal();
        openModal(false);
        showToast('Пожалуйста, войдите в аккаунт для оформления заказа!');
        return;
    }

    if (!currentUser.myLibrary) currentUser.myLibrary = [];

    const existing = currentUser.myLibrary.find(b => b.id === selectedBookForOrder.id);
    if (existing && existing.type === 'buy') {
        showToast('Эта книга уже куплена вами навсегда!');
        closeOrderModal();
        return;
    }

    let expiryDate = null;
    let totalDays = 0;
    let optionLabel = 'Куплено навсегда';
    const now = new Date();

    if (selectedOptionType === 'rent_2w') {
        totalDays = 14;
        expiryDate = new Date(now.getTime() + totalDays * 24 * 60 * 60 * 1000).toISOString();
        optionLabel = 'Арендовано на 2 недели';
    } else if (selectedOptionType === 'rent_1m') {
        totalDays = 30;
        expiryDate = new Date(now.getTime() + totalDays * 24 * 60 * 60 * 1000).toISOString();
        optionLabel = 'Арендовано на 1 месяц';
    } else if (selectedOptionType === 'rent_3m') {
        totalDays = 90;
        expiryDate = new Date(now.getTime() + totalDays * 24 * 60 * 60 * 1000).toISOString();
        optionLabel = 'Арендовано на 3 месяца';
    }

    const orderRecord = {
        id: selectedBookForOrder.id,
        title: selectedBookForOrder.title,
        author: selectedBookForOrder.author,
        type: selectedOptionType === 'buy' ? 'buy' : 'rent',
        rentDate: new Date().toISOString(),
        expiry: expiryDate,
        totalDays: totalDays
    };

    if (existing) {
        Object.assign(existing, orderRecord);
    } else {
        currentUser.myLibrary.push(orderRecord);
    }

    saveUserData();
    showToast(`Успешно! Книга «${selectedBookForOrder.title}»: ${optionLabel}`);
    closeOrderModal();
    updateUI();
}

function openMyBooksModal() {
    if (!currentUser) return;
    document.getElementById('myBooksModal').style.display = 'flex';
    renderMyLibrary();
}

function renderMyLibrary() {
    const listContainer = document.getElementById('myBooksList');
    const library = currentUser.myLibrary || [];

    if (library.length === 0) {
        listContainer.innerHTML = '<p style="color: #64748b; text-align:center; padding:20px;">На вашей полке пока пусто.</p>';
        return;
    }

    listContainer.innerHTML = library.map(book => {
        let statusBadge = '';
        let timerSection = '';
        let actionButton = `<button class="btn btn-danger" onclick="returnBook(${book.id})">Удалить с полки</button>`;

        if (book.type === 'buy') {
            statusBadge = '<span class="shelf-status status-owned">В собственности</span>';
            timerSection = '<div style="font-size: 12px; color: #94a3b8; margin-top:4px;">Доступ бессрочный</div>';
        } else {
            statusBadge = '<span class="shelf-status status-rented">В аренде</span>';
            actionButton = `<button class="btn btn-danger" onclick="returnBook(${book.id}, true)">Вернуть досрочно</button>`;
            
            const timeDiff = new Date(book.expiry) - new Date();
            const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            
            if (daysLeft > 0) {
                const totalDuration = new Date(book.expiry) - new Date(book.rentDate);
                const progressPercent = Math.max(0, Math.min(100, (timeDiff / totalDuration) * 100));
                const isUrgent = daysLeft <= 3 ? 'urgent' : '';

                timerSection = `
                    <div style="font-size: 12px; color: #64748b; margin-top:4px;">Осталось дней: ${daysLeft}</div>
                    <div class="progress-container">
                        <div class="progress-bar ${isUrgent}" style="width: ${progressPercent}%"></div>
                    </div>
                `;
            } else {
                timerSection = '<div style="font-size: 12px; color: #ef4444; font-weight: bold; margin-top:4px;">Срок аренды истек!</div>';
            }
        }

        return `
            <div class="shelf-item">
                <div class="shelf-info">
                    <strong>${book.title}</strong>
                    <div style="font-size: 13px; color: #64748b;">${book.author}</div>
                    ${timerSection}
                </div>
                <div class="shelf-status-wrapper">
                    ${statusBadge}
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');
}

function returnBook(bookId, isRent = false) {
    currentUser.myLibrary = currentUser.myLibrary.filter(b => b.id !== bookId);
    saveUserData();
    showToast(isRent ? 'Книга успешно возвращена в библиотеку!' : 'Книга удалена с вашей полки.');
    renderMyLibrary();
}

function saveUserData() {
    users = users.map(u => u.email === currentUser.email ? currentUser : u);
    localStorage.setItem('users', JSON.stringify(users));
}

function closeMyBooksModal() { document.getElementById('myBooksModal').style.display = 'none'; }

function openAnnotationModal(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    document.getElementById('annotationTitle').textContent = book.title;
    document.getElementById('annotationAuthor').textContent = book.author;
    document.getElementById('annotationBody').textContent = book.annotation || "Аннотация временно отсутствует.";
    document.getElementById('annotationModal').style.display = 'flex';
}

function closeAnnotationModal() { document.getElementById('annotationModal').style.display = 'none'; }
function openModal(signUpMode = false) { document.getElementById('authModal').style.display = 'flex'; toggleMode(signUpMode); }
function closeModal() { document.getElementById('authModal').style.display = 'none'; document.getElementById('authForm').reset(); }

function toggleMode(signUp) {
    isSignUp = signUp;
    document.getElementById('modalTitle').textContent = isSignUp ? 'Регистрация нового аккаунта' : 'Личный кабинет';
    document.getElementById('submitBtn').textContent = isSignUp ? 'Зарегистрироваться' : 'Войти в систему';
    document.getElementById('nameGroup').style.display = isSignUp ? 'block' : 'none';
    document.getElementById('phoneGroup').style.display = isSignUp ? 'block' : 'none';
    document.getElementById('authName').required = isSignUp;
    document.getElementById('authPhone').required = isSignUp;
    const switchContainer = document.getElementById('switchFormContainer');
    if (isSignUp) {
        switchContainer.innerHTML = 'Уже есть аккаунт? <a href="#" onclick="toggleMode(false)">Войти</a>';
    } else {
        switchContainer.innerHTML = 'Нет аккаунта? <a href="#" onclick="toggleMode(true)">Зарегистрироваться</a>';
    }
}

function handleAuth(e) {
    e.preventDefault();
    const name = document.getElementById('authName').value;
    const email = document.getElementById('authEmail').value;
    const phone = document.getElementById('authPhone').value;
    const password = document.getElementById('authPassword').value;
    const role = document.getElementById('authRole').value;

    if (isSignUp) {
        if (users.find(u => u.email === email)) {
            showToast('Пользователь с такой почтой уже существует!');
            return;
        }
        const newUser = { name, email, phone, password, role, myLibrary: [] };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        currentUser = newUser;
        showToast('Успешная регистрация и вход!');
    } else {
        const user = users.find(u => u.email === email && u.password === password && u.role === role);
        if (!user) {
            showToast('Ошибка! Проверьте данные и выбранную роль.');
            return;
        }
        currentUser = user;
        showToast(`Добро пожаловать, ${user.name || 'Пользователь'}!`);
    }
    updateUI();
    closeModal();
}

function updateUI() {
    if (currentUser) {
        document.getElementById('userBadge').style.display = 'flex';
        document.getElementById('userName').textContent = `${currentUser.name || currentUser.email} (${currentUser.role === 'admin' ? 'Админ' : 'Покупатель'})`;
        document.getElementById('loginNavBtn').style.display = 'none';
        document.getElementById('registerNavBtn').style.display = 'none';
        document.getElementById('logoutNavBtn').style.display = 'block';
        document.getElementById('myBooksBtn').style.display = currentUser.role === 'customer' ? 'block' : 'none';
        
        if (currentUser.role === 'admin') { 
            document.body.classList.add('admin-active'); 
            renderAdminTable(); 
        } else { 
            document.body.classList.remove('admin-active'); 
        }
    } else {
        document.getElementById('userBadge').style.display = 'none';
        document.getElementById('myBooksBtn').style.display = 'none';
        document.getElementById('loginNavBtn').style.display = 'block';
        document.getElementById('registerNavBtn').style.display = 'block';
        document.getElementById('logoutNavBtn').style.display = 'none';
        document.body.classList.remove('admin-active');
    }
}

function logout() { currentUser = null; updateUI(); showToast('Вы успешно вышли из системы.'); }

// Запуск первичной отрисовки книг
renderBooks();
