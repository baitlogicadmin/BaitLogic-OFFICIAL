document.addEventListener("DOMContentLoaded", () => {
    console.log("BaitLogic initialized");

    if (!window.supabase) {
        console.error("Supabase library missing");
        return;
    }

    if (!window.BAITLOGIC_CONFIG) {
        console.error("Config missing");
        return;
    }

    const { createClient } = window.supabase;

    const supabase = createClient(
        window.BAITLOGIC_CONFIG.supabaseUrl,
        window.BAITLOGIC_CONFIG.supabaseAnonKey
    );

    // WAITLIST
    const signupForm = document.getElementById("signupForm");

    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const payload = {
                name: signupForm.name.value.trim(),
                email: signupForm.email.value.trim(),
                home_water: "",
                main_interest: "",
                interest: ""
            };

            try {
                const { error } = await supabase
                    .from("waitlist_signups")
                    .insert([payload]);

                if (error) throw error;

                alert("Welcome to the BaitLogic Crew!");
                signupForm.reset();

            } catch (err) {
                console.error(err);
                alert(err.message);
            }
        });
    }

    console.log("BaitLogic ready");
});