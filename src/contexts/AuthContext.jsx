import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for an existing session
        const storedUser = localStorage.getItem("todo_user");
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    function signup(name, email, password) {
        // Mock Signup with name: Just log them in immediately
        const user = { name, email, uid: Date.now().toString() };
        localStorage.setItem("todo_user", JSON.stringify(user));
        setCurrentUser(user);
        return Promise.resolve(user);
    }

    function login(nameOrEmail, password) {
        // Mock Login: Accept name OR email
        // In a real app, you'd query the database to find user by name or email
        // For demo, we'll just accept any name/email and create a user
        const user = {
            name: nameOrEmail.includes('@') ? 'User' : nameOrEmail,
            email: nameOrEmail.includes('@') ? nameOrEmail : `${nameOrEmail}@example.com`,
            uid: "demo-user-123"
        };
        localStorage.setItem("todo_user", JSON.stringify(user));
        setCurrentUser(user);
        return Promise.resolve(user);
    }

    function logout() {
        localStorage.removeItem("todo_user");
        setCurrentUser(null);
        return Promise.resolve();
    }

    const value = {
        currentUser,
        signup,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
