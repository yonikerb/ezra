import {
  auth,
  db,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  increment,
  serverTimestamp
} from "../firebase.js";

const activeUsersCountEl = document.getElementById("activeUsersCount");
const usersTableBody = document.getElementById("usersTableBody");
const createUserForm = document.getElementById("createUserForm");
const createUserMsg = document.getElementById("createUserMsg");
const livePagesList = document.getElementById("livePagesList");
const clockEl = document.getElementById("clock");

// --- טען שעון חי ---
function updateClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString('he-IL');
}
setInterval(updateClock, 1000);
updateClock();

// --- טען משתמשים ---
async function loadUsers() {
  usersTableBody.innerHTML = "";
  const usersSnapshot = await getDocs(collection(db, "users"));
  usersSnapshot.forEach(docSnap => {
    const u = docSnap.data();
    const uid = docSnap.id;

    const tr = document.createElement("tr");
    const emailTd = document.createElement("td");
    const approvedTd = document.createElement("td");
    const blockedTd = document.createElement("td");
    const loginsTd = document.createElement("td");
    const lastLoginTd = document.createElement("td");
    const actionsTd = document.createElement("td");

    emailTd.textContent = u.email || "-";
    approvedTd.textContent = u.isApproved ? "✔️" : "❌";
    blockedTd.textContent = u.isBlocked ? "חסום" : "לא חסום";
    loginsTd.textContent = u.loginCount || 0;
    lastLoginTd.textContent = u.lastLogin?.toDate?.().toLocaleString("he-IL") || "-";

    const approveBtn = document.createElement("button");
    approveBtn.textContent = "אשר";
    approveBtn.className = "approve";
    approveBtn.onclick = () => updateUserField(uid, "isApproved", true);

    const blockBtn = document.createElement("button");
    blockBtn.textContent = "חסום";
    blockBtn.className = "block";
    blockBtn.onclick = () => updateUserField(uid, "isBlocked", true);

    const unblockBtn = document.createElement("button");
    unblockBtn.textContent = "בטל חסימה";
    unblockBtn.className = "approve";
    unblockBtn.onclick = () => updateUserField(uid, "isBlocked", false);

    actionsTd.appendChild(approveBtn);
    actionsTd.appendChild(u.isBlocked ? unblockBtn : blockBtn);

    tr.append(emailTd, approvedTd, blockedTd, loginsTd, lastLoginTd, actionsTd);
    usersTableBody.appendChild(tr);
  });
}

async function updateUserField(uid, field, value) {
  await updateDoc(doc(db, "users", uid), { [field]: value });
  loadUsers();
}

// --- יצירת משתמש ---
createUserForm.addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("newUserEmail").value.trim();
  const password = document.getElementById("newUserPassword").value.trim();

  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", user.uid), {
      email,
      isApproved: false,
      isBlocked: false,
      loginCount: 0,
      lastLogin: null
    });
    createUserMsg.textContent = "משתמש נוצר!";
    loadUsers();
  } catch (e) {
    createUserMsg.textContent = "שגיאה: " + e.message;
  }
});

// --- נתונים חיים ---
async function loadActiveUsersCount() {
  const docSnap = await getDoc(doc(db, "stats", "activeUsers"));
  activeUsersCountEl.textContent = docSnap.exists() ? docSnap.data().count || 0 : "0";
}

async function loadLivePages() {
  const docSnap = await getDoc(doc(db, "stats", "livePages"));
  livePagesList.innerHTML = "";
  if (docSnap.exists()) {
    for (const [uid, page] of Object.entries(docSnap.data())) {
      const li = document.createElement("li");
      li.textContent = `משתמש ${uid}: צופה ב-${page}`;
      livePagesList.appendChild(li);
    }
  } else {
    livePagesList.innerHTML = "<li>אין מידע</li>";
  }
}

// טען כל שנייה
function autoRefresh() {
  loadUsers();
  loadActiveUsersCount();
  loadLivePages();
}
setInterval(autoRefresh, 1000);
autoRefresh();
