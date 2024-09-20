const functionCalled = new Event('functionCalled');
const areaAdjusted = new Event('areaAdjusted');
const debouncedUpdateDatabase = debounce(updateDatabase, 250);
let updateInProgress = false;

async function itemListener(event) 
{
    if (updateInProgress && document.querySelector(".webapp-textarea-body")) {
        await debouncedUpdateDatabase();
    }

    await fetchData();

    var trigger = event.srcElement;
    id = parseInt(trigger.id);

    var item = {};
    var tags = [];

    for (let i = 0; i < itemsData.length; i++)
    {
        if (itemsData[i]["id"] == id)
        {
            item = itemsData[i];
        }
    }

    for (let i = 0; i < tagsData.length; i++)
    {
        if (tagsData[i]["item_id"] == id)
        {
            tags.push(tagsData[i]["tag"]);
        }
    }

    document.querySelector('.edit_item_column').id = "edit_item_column" + item.id;

    let titleTextArea = document.createElement("textarea");
    if (!document.querySelector(".webapp-textarea-title"))
    {
        titleTextArea.classList.add("webapp-textarea-title");
        titleTextArea.rows = 1;
        titleTextArea.wrap = "soft";
        titleTextArea.spellcheck = "false";
        titleTextArea.addEventListener("input", debouncedUpdate);
        document.addEventListener("areaAdjusted", adjustTextareaHeight)
        titleTextArea.addEventListener("keydown", function(key_event) {
            if (key_event.key === "Enter") 
            {
                key_event.preventDefault();
            }
            });
        titleTextArea.addEventListener("input", function(key_event) {
            this.style.height = 'auto'; 
            this.style.height = this.scrollHeight + 'px'; 
            document.dispatchEvent(areaAdjusted);
        });
        document.querySelector("#item_title_display").appendChild(titleTextArea);
    }
    titleTextArea = document.querySelector(".webapp-textarea-title");
    titleTextArea.style.cssText = '';
    titleTextArea.value = item.title;
    titleTextArea.style.height = titleTextArea.scrollHeight + 'px';

    document.querySelector("#item_header_display").classList.add("webapp-item-header");
    document.querySelector("#item_tags_display").innerHTML = "Tags:";
    document.querySelector("#item_tags_display").classList.add("webapp-item-tags");
    let ul = document.createElement("ul");
    ul.classList.add("webapp-item-tags-ul")
    for (let i = 0; i < tags.length; i++)
    {
        let li = document.createElement("li");
        li.textContent = "#" + tags[i];
        li.classList.add("webapp-item-tags-li")
        ul.appendChild(li);
    }

    if (item.item_type == "task")
    {
        let input = document.createElement("input");
        input.classList.add("form-check-input", "webapp-task-p" + String(item.item_priority));
        input.setAttribute("type", "checkbox");
        input.setAttribute("id", "check-item");
        document.querySelector("#item_check_display").classList.add("check-display-border");
        if (!document.querySelector("#check-item"))
        {
            document.querySelector("#item_check_display").appendChild(input);
        }
        else
        {
            document.querySelector("#item_check_display").replaceChild(input, document.querySelector("#check-item"));
        }
    }
    if (item.item_type == "note" && document.querySelector("#check-item"))
    {
        document.querySelector("#item_check_display").removeChild(document.querySelector("#check-item"));
    }
    document.querySelector("#item_tags_display").appendChild(ul);
    if (!item.deadline)
    {
        document.querySelector("#item_deadline_display").innerHTML = "Add Date";
    }
    else
    {
        document.querySelector("#item_deadline_display").innerHTML = item.deadline;
    }
    document.querySelector("#item_deadline_display").classList.add("deadline-display");
    document.querySelector("#item_priority_display").innerHTML = "Priority: " + item.item_priority;
    document.querySelector("#item_priority_display").classList.add("priority-display");

    let bodyTextArea = document.createElement("textarea");
    if (!document.querySelector(".webapp-textarea-body"))
    {
        bodyTextArea.classList.add("webapp-textarea-body");
        bodyTextArea.spellcheck = "false";
        document.querySelector("#item_body_display").appendChild(bodyTextArea);
        bodyTextArea.addEventListener("input", debouncedUpdate);
    }

    document.querySelector(".webapp-textarea-body").value = "";
    console.log("Value before update:", document.querySelector(".webapp-textarea-body").value);
    document.querySelector(".webapp-textarea-body").value = item.body;
    console.log("Value after update:", document.querySelector(".webapp-textarea-body").value);

    adjustTextareaHeight();
}


function adjustTextareaHeight() 
{
    const headerHeight = (
        document.querySelector('#item_header_display').offsetHeight + 
        document.querySelector('#item_title_display').offsetHeight + 
        document.querySelector('#item_tags_display').offsetHeight);
    const headerMargin = (
        parseFloat(getComputedStyle(document.querySelector('#item_header_display')).marginBottom) +
        parseFloat(getComputedStyle(document.querySelector('#item_title_display')).marginBottom) +
        parseFloat(getComputedStyle(document.querySelector('#item_tags_display')).marginBottom)
    );
    const containerPadding = parseFloat(getComputedStyle(document.querySelector('.edit_item_column')).padding);
    const viewportHeight = window.innerHeight;
    const textarea = document.querySelector('.webapp-textarea-body');
    const maxHeight = viewportHeight - containerPadding - headerHeight - headerMargin;
    
    if (textarea)
    {
        textarea.style.height = `${Math.max(0, maxHeight)}px`;
    }
}

async function updateDatabase()
{
    console.log("updateDatabase called");

    let itemId = document.querySelector(".edit_item_column").id.replace("edit_item_column", "");
    let bodyValue = document.querySelector(".webapp-textarea-body").value;
    let titleValue = document.querySelector(".webapp-textarea-title").value;
    let payload = { item_id: itemId, body_value: bodyValue, title_value: titleValue };
    console.log("Payload:", payload);
    let csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    await fetch("/update", 
        {
            method: "POST", 
            headers: 
            {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify(payload)
        }
    ).then(response => response.json()).then(data => console.log(data));
    document.dispatchEvent(functionCalled);
}


async function readDatabase(type)
{
    console.log("readDatabase called");

    let payload = {"type": type};
    let csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    let itemsData = await fetch("/read", {
        method: "POST", 
        headers: 
        {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: JSON.stringify(payload)
        }).then(response => response.json());

    return itemsData;

}

function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        return new Promise((resolve) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                resolve(func.apply(this, args));
            }, delay);
        });
    };
}

async function debouncedUpdate() 
{
    updateInProgress = true;
    await debouncedUpdateDatabase();
    updateInProgress = false;
}