$(function () {
    var ideKey = "XDEBUG_ECLIPSE";
    var traceTrigger = ideKey;
    var profileTrigger = ideKey;

    // Load stored values from chrome.storage.local
    chrome.storage.local.get(
        ["xdebugIdeKey", "xdebugTraceTrigger", "xdebugProfileTrigger"],
        function (data) {
            if (data.xdebugIdeKey) ideKey = data.xdebugIdeKey;
            if (data.xdebugTraceTrigger) traceTrigger = data.xdebugTraceTrigger;
            if (data.xdebugProfileTrigger) profileTrigger = data.xdebugProfileTrigger;

            // Request the current state from the active tab
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (!tabs.length) return;

                chrome.tabs.sendMessage(
                    tabs[0].id,
                    {
                        cmd: "getStatus",
                        idekey: ideKey,
                        traceTrigger: traceTrigger,
                        profileTrigger: profileTrigger,
                    },
                    function (response) {
                        if (chrome.runtime.lastError || !response) return;
                        $('a[data-status="' + response.status + '"]').addClass("active");
                    }
                );
            });
        }
    );

    // Click event for options
    $("a").on("click", function () {
        var newStatus = $(this).data("status");

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (!tabs.length) return;

            chrome.tabs.sendMessage(
                tabs[0].id,
                {
                    cmd: "setStatus",
                    status: newStatus,
                    idekey: ideKey,
                    traceTrigger: traceTrigger,
                    profileTrigger: profileTrigger,
                },
                function (response) {
                    if (chrome.runtime.lastError || !response) return;

                    // Notify the background script to update the icon
                    chrome.runtime.sendMessage({
                        cmd: "updateIcon",
                        status: response.status,
                        tabId: tabs[0].id,
                    });

                    // Close the popup
                    window.close();
                }
            );
        });
    });

    // Keyboard Shortcuts
    key("d", function () { $("#action-debug").click(); });
    key("p", function () { $("#action-profile").click(); });
    key("t", function () { $("#action-trace").click(); });
    key("s", function () { $("#action-disable").click(); });
    key("space,enter", function () { $("a:focus").click(); });

    key("down,right", function () {
        var current = $(".action:focus");
        if (current.length === 0) {
            $(".action:first").focus();
        } else {
            current.parent().next().find("a").focus();
        }
    });

    key("up,left", function () {
        var current = $(".action:focus");
        if (current.length === 0) {
            $(".action:last").focus();
        } else {
            current.parent().prev().find("a").focus();
        }
    });

    // Prevent Chrome from auto-focusing the first option
    $("a").on("focus", function () {
        $(this).blur();
        $("a").off("focus");
    });
});
