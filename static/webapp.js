const updateDatabaseCalled = new Event('updateDatabaseCalled');
const areaAdjusted = new Event('areaAdjusted');
const fetchDataCalled = new Event('fetchDataCalled');
const debouncedUpdateDatabase = debounce(updateDatabase, 250);
let updateInProgress = false;

async function itemListener(event) 
{
    event.stopPropagation();
    var trigger = event.target;
    console.log("Trigger for Item Listener: ", trigger);

    if (trigger.children.length == 0) 
    {
        trigger = trigger.parentNode;
    }

    id = parseInt(trigger.id);

    resetItems();
    if (updateInProgress && document.querySelector(".webapp-textarea-body")) 
    {
        await debouncedUpdateDatabase();
    }

    await fetchData();

    var item = {};
    var tags = [];
    var lists = {};

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

    for (let i = 0; i < listsData.length; i++)
        {
            lists[listsData[i]["id"]] = listsData[i]["list_name"]
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

    //Adjusting tags
    document.querySelector("#item_tags_display").innerHTML = "";
    document.querySelector("#item_tags_display").classList.add("webapp-item-tags");

    let ul = document.createElement("ul");
    ul.classList.add("webapp-item-tags-ul");
    document.querySelector("#item_tags_display").appendChild(ul);
    for (let i = 0; i < tags.length + 1; i++)
    {
        if (tags[i])
        {
            addTagLiToUl(tags[i]);
        }
        else
        {
            createAddTagLiToUl();
        }
        
    }

    //Adjusting checkbox
    if (item.item_type == "task")
    {
        createItemCheck();
        document.querySelector("#check-item").checked = false;
    }
    if (item.item_type == "note" && document.querySelector("#check-item"))
    {
        document.querySelector("#item_check_display").removeChild(document.querySelector("#check-item"));
        document.querySelector("#item_check_display").style.border = "none";
    }
    let listItem = document.getElementById(String(item.id));
    if (listItem && listItem.children[0].checked)
    {
        document.querySelector("#check-item").checked = true;
        debouncedUpdate();
        itemChangeCompletion();
    }

    // Adjusting the deadline date
    if (!document.querySelector(".deadline-display"))
    {
        let deadlineDatePicker = document.createElement("input");
        deadlineDatePicker.setAttribute("type", "date");
        deadlineDatePicker.flatpickrInstance = flatpickr(deadlineDatePicker, {defaultDate: item.deadline});
        deadlineDatePicker.setAttribute("placeholder", "YYYY-MM-DD");
        deadlineDatePicker.classList.add("webapp-deadline");   
        document.querySelector("#item_deadline_display").appendChild(deadlineDatePicker);
        document.querySelector("#item_deadline_display").classList.add("deadline-display");
        deadlineDatePicker.addEventListener("input", debouncedUpdate);
    }
    else
    {
        document.querySelector(".webapp-deadline").flatpickrInstance.clear();
    }
    
    if (item.deadline)
    {
        document.querySelector(".webapp-deadline").value = item.deadline;
        document.querySelector(".webapp-deadline").flatpickrInstance.setDate(item.deadline);
    }
    else
    {
        document.querySelector(".webapp-deadline").value = "";
    }


    //Adjusting the item priority
    if (item.item_type == "task")
    {
        createItemPriority();
    }
    else if (item.item_type == "note" && document.querySelector(".priority-display"))
    {
        document.querySelector("#item_priority_display").innerHTML = "";
        document.querySelector("#item_priority_display").className = "";
        document.querySelector("#item_priority_display").classList.add("webapp-text", "small");
    }
    
    //Adjusting the textarea for the body text
    let bodyTextArea = document.createElement("textarea");
    if (!document.querySelector(".webapp-textarea-body"))
    {
        bodyTextArea.classList.add("webapp-textarea-body");
        bodyTextArea.spellcheck = "false";
        document.querySelector("#item_body_display").appendChild(bodyTextArea);
        bodyTextArea.addEventListener("input", debouncedUpdate);
    }

    document.querySelector(".webapp-textarea-body").value = "";
    document.querySelector(".webapp-textarea-body").value = item.body;

    //Adjusting the footer

    //Adjusting the list selection
    let listDisplay = document.querySelector("#item_list_display");
    let listSelect = document.createElement("select");
    if (!document.querySelector(".webapp-list-display"))
    {
        listDisplay.classList.add("webapp-list-display");
        listSelect.classList.add("webapp-list-select");
        listSelect.setAttribute("name", "List");
        listDisplay.innerHTML = "List: ";
        listDisplay.appendChild(listSelect);
        listSelect.addEventListener("input", debouncedUpdate);
        for (let i = 0; i < listsData.length; i++)
        {
            let optionListSelect = document.createElement("option");
            optionListSelect.value = listsData[i]["list_name"];
            optionListSelect.innerHTML = listsData[i]["list_name"];
            listSelect.appendChild(optionListSelect);
        }
        document.dispatchEvent(areaAdjusted);
        listSelect.addEventListener("input", debouncedUpdate);

    }
    document.querySelector(".webapp-list-select").value = item.list;

    //Adjusting the type selection
    let typeDisplay = document.querySelector("#item_type_display");
    let typeSelect = document.createElement("select");
    if (!document.querySelector(".webapp-type-display"))
    {
        let types = ["note", "task"];
        typeDisplay.classList.add("webapp-type-display");
        typeSelect.classList.add("webapp-type-select");
        typeSelect.setAttribute("name", "Type");
        typeDisplay.innerHTML = "Type: ";
        typeDisplay.appendChild(typeSelect);
        typeSelect.addEventListener("input", debouncedUpdate);
        for (let i = 0; i < types.length; i++)
        {
            let optionTypeSelect = document.createElement("option");
            optionTypeSelect.value = types[i];
            optionTypeSelect.innerHTML = types[i][0].toUpperCase() + types[i].slice(1);
            typeSelect.appendChild(optionTypeSelect);
        }
        document.dispatchEvent(areaAdjusted);
        typeSelect.addEventListener("input", debouncedUpdate);
    }
    document.querySelector(".webapp-type-select").value = item.item_type;

    //Adjusting the delete display
    let deleteImage = document.createElement("img");
    let deleteDisplay = document.querySelector("#item_delete_display");
    deleteDisplay.innerHTML = "";
    deleteDisplay.className = "";
    if (!document.querySelector(".webapp-delete"))
    {
        deleteImage.setAttribute("src", "/static/untangle-trash.png");
        deleteImage.classList.add("webapp-delete-image");
        deleteDisplay.classList.add("webapp-delete");
        deleteImage.style.height = deleteDisplay.scrollHeight + "px";
        deleteDisplay.appendChild(deleteImage);
        deleteImage.addEventListener("click", deleteItem);
    }

    adjustTextareaHeight();
    updateItemTitleSelected();
}


function adjustTextareaHeight() 
{
    const headerHeight = (
        document.querySelector('#item_header_display').offsetHeight + 
        document.querySelector('#item_title_display').offsetHeight + 
        document.querySelector('#item_tags_display').offsetHeight +
        document.querySelector('#item_footer_display').offsetHeight);
    const headerMargin = (
        parseFloat(getComputedStyle(document.querySelector('#item_header_display')).marginBottom) +
        parseFloat(getComputedStyle(document.querySelector('#item_title_display')).marginBottom) +
        parseFloat(getComputedStyle(document.querySelector('#item_tags_display')).marginBottom) +
        parseFloat(getComputedStyle(document.querySelector('#item_footer_display')).marginBottom)
        +parseFloat(getComputedStyle(document.querySelector('#item_footer_display')).marginTop)
    );
    const containerPadding = parseFloat(getComputedStyle(document.querySelector('.edit_item_column')).padding);
    const viewportHeight = window.innerHeight;
    const textarea = document.querySelector('.webapp-textarea-body');
    const maxHeight = viewportHeight - containerPadding - headerHeight - headerMargin;
    
    if (textarea)
    {
        textarea.style.height = `${Math.max(0, maxHeight-10)}px`;
    }
}

async function updateDatabase()
{
    console.log("updateDatabase called");

    let itemId = document.querySelector(".edit_item_column").id.replace("edit_item_column", "");
    let bodyValue = document.querySelector(".webapp-textarea-body").value;
    let titleValue = document.querySelector(".webapp-textarea-title").value;
    let deadlineValue = document.querySelector(".webapp-deadline").value;
    let priorityValue;
    if (document.querySelector(".webapp-priority"))
    {
        priorityValue = document.querySelector(".webapp-priority").value;
    }
    else
    {
        priorityValue = 0;
    }
    let tagsUl = document.querySelector(".webapp-item-tags-ul");
    let tagsLi = tagsUl.querySelectorAll("li");
    let tagsList = [];
    for (let i = 0; i < tagsLi.length; i++)
    {
        let tagValue = tagsLi[i].children[0].value;
        if (tagValue)
        {
            tagsList.push(tagValue);
        }
    }
    let listName = document.querySelector(".webapp-list-select").value;
    let typeValue = document.querySelector(".webapp-type-select").value;
    let statusValue;
    if (document.querySelector("#check-item"))
    {
        statusValue = document.querySelector("#check-item").checked;
    }
    else
    {
        statusValue = false;
    }

    let payload = { item_id: itemId, 
        body_value: bodyValue, 
        title_value: titleValue, 
        deadline_value: deadlineValue,
        priority_value: priorityValue,
        tags_list: tagsList,
        list_name: listName,
        type_value: typeValue,
        status_value: statusValue };
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
    document.dispatchEvent(updateDatabaseCalled);
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


function updateItemTitle()
{
    for (let i = 0; i < itemsData.length; i++)
    {
        let item = document.getElementById(String(itemsData[i].id));
        if (item)
        {
            item.children[1].innerHTML = itemsData[i].title;
            item.children[0].className = "";
            if (itemsData[i].item_type == "task")
            {
                let checkInput = document.createElement("input");
                checkInput.setAttribute("type", "checkbox");
                if (itemsData[i].item_priority == "null" || itemsData[i].item_priority == 0)
                {
                    item.children[0].classList.add("form-check-input", "webapp-task-p0");
                }
                else
                {
                    item.children[0].classList.add("form-check-input", "webapp-task-p" + String(itemsData[i].item_priority));
                }

                if (item.children[0].tagName != "INPUT")
                {
                    item.replaceChild(checkInput, item.children[0]);
                }
            }
            else if (itemsData[i].item_type == "note" && item.children[0].tagName != "IMG")
            {
                console.log("Tag name:", item.children[0].tagName);
                console.log("Update list note image.");
                let noteImage = document.createElement("img");
                noteImage.setAttribute("src", "/static/edit.png");
                item.replaceChild(noteImage, item.children[0]);
            }
        }
    }
}


function updateItemTitleSelected()
{
    for (let i = 0; i < itemsData.length; i++)
    {
        let itemDisplayed = document.querySelector("#edit_item_column" + String(itemsData[i].id));
        let item = document.getElementById(String(itemsData[i].id));
        if (itemDisplayed && item)
        {
            item.style.setProperty('background-color', 'rgba(100, 100, 100, 0.2)', 'important');
        }
    }
}


function resetItems()
{
    for (let i = 0; i < itemsData.length; i++)
    {
        let item = document.getElementById(String(itemsData[i].id));
        if (item)
        {
            item.style.cssText = ''; 
        }
    }
}


function priorityColor()
{
    const selectElement = document.querySelector(".webapp-priority");
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const color = window.getComputedStyle(selectedOption).color;
    selectElement.style.color = color;
}


function updateCheckBox()
{
    for (let i = 0; i < itemsData.length; i++)
    {
        let itemId = parseInt(document.querySelector(".edit_item_column").id.replace("edit_item_column", ""));
        if (itemsData[i].id == itemId && itemsData[i].item_type == "task")
        {
            document.querySelector("#check-item").className = "";
            document.querySelector("#check-item").classList.add("form-check-input");
            if (itemsData[i].item_priority != "null")
            {
                document.querySelector("#check-item").classList.add("webapp-task-p" + String(itemsData[i].item_priority));
            }
            else
            {
                document.querySelector("#check-item").classList.add("webapp-task-p0");
            }

            let listItem = document.getElementById(String(itemId));
            if (listItem && listItem.children[0].checked)
            {
                document.querySelector("#check-item").checked = true;
            }
        }
    }
}

function addTagLiToUl(tag)
{
    let li = document.createElement("li");
    li.classList.add("webapp-item-tags-li");
    let inputLi = document.createElement("input");
    inputLi.setAttribute("type", "text");
    inputLi.setAttribute("maxlength", "30");
    inputLi.setAttribute("disabled", "true");
    inputLi.classList.add("webapp-item-tags-li-input");
    inputLi.value = tag;

    // Create a temporary span to measure the text width
    let tempSpan = document.createElement("span");
    tempSpan.style.visibility = "hidden";
    tempSpan.style.position = "absolute";
    tempSpan.style.whiteSpace = "nowrap";
    tempSpan.textContent = inputLi.value;
    document.body.appendChild(tempSpan);

    // Set the input width to the span's width
    inputLi.style.width = (tempSpan.offsetWidth + 10) + 'px';

    // Clean up the temporary span
    document.body.removeChild(tempSpan);

    li.appendChild(inputLi);
    document.querySelector(".webapp-item-tags-ul").appendChild(li);

    let deleteBtn = document.createElement("span");
    deleteBtn.classList.add("delete-btn");
    deleteBtn.textContent = "X";
    li.appendChild(deleteBtn);

    deleteBtn.addEventListener("click", function() {
        li.remove();
        debouncedUpdate();
    });
    
    inputLi.addEventListener("input", function () {
        // Create a temporary span to measure the text width
        let tempSpan = document.createElement("span");
        tempSpan.style.visibility = "hidden";
        tempSpan.style.position = "absolute";
        tempSpan.style.whiteSpace = "nowrap";
        tempSpan.textContent = inputLi.value;
        document.body.appendChild(tempSpan);

        // Set the input width to the span's width
        inputLi.style.width = (tempSpan.offsetWidth + 10) + 'px';

        // Clean up the temporary span
        document.body.removeChild(tempSpan);

        document.dispatchEvent(areaAdjusted);
    });
    inputLi.addEventListener("input", debouncedUpdate);
}

function createAddTagLiToUl()
{
    let addTagLi = document.createElement("li");
    addTagLi.classList.add("webapp-item-tags-li");
    let addTagInput = document.createElement("input");
    addTagInput.setAttribute("type", "text");
    addTagInput.setAttribute("maxlength", "30");
    addTagInput.setAttribute("placeholder", "+ add tag");
    addTagInput.classList.add("webapp-item-tags-li-input-add")

    // Create a temporary span to measure the text width
    let tempSpan = document.createElement("span");
    tempSpan.style.visibility = "hidden";
    tempSpan.style.position = "absolute";
    tempSpan.style.whiteSpace = "nowrap";
    tempSpan.textContent = addTagInput.placeholder;
    document.body.appendChild(tempSpan)

    // Set the input width to the span's width
    addTagInput.style.width = (tempSpan.offsetWidth + 10) + 'px'

    // Clean up the temporary span
    document.body.removeChild(tempSpan)

    addTagLi.appendChild(addTagInput);
    document.querySelector(".webapp-item-tags-ul").appendChild(addTagLi)

    addTagInput.addEventListener("input", function () {
        // Create a temporary span to measure the text width
        let tempSpan = document.createElement("span");
        tempSpan.style.visibility = "hidden";
        tempSpan.style.position = "absolute";
        tempSpan.style.whiteSpace = "nowrap";

        if (addTagInput.value)
        {
            tempSpan.textContent = addTagInput.value;
        }
        else
        {
            tempSpan.textContent = addTagInput.placeholder;
        }

        document.body.appendChild(tempSpan);

        // Set the input width to the span's width
        addTagInput.style.width = (tempSpan.offsetWidth + 10) + 'px';

        // Clean up the temporary span
        document.body.removeChild(tempSpan);

        document.dispatchEvent(areaAdjusted);
    });
    addTagInput.addEventListener("keydown", function(key_event) {
        if (key_event.key === "Enter") 
        {
            let itemId = parseInt(document.querySelector(".edit_item_column").id.replace("edit_item_column", ""));
            let flag = false;
            for (let i = 0; i < tagsData.length; i++)
            {
                if (addTagInput.value == tagsData[i].tag && itemId == tagsData[i].item_id)
                {
                    flag = true;
                }
            }
            if (!flag)
            {
                let parentLi = addTagLi.parentNode;
                parentLi.removeChild(addTagLi);
                addTagLiToUl(addTagInput.value);
                createAddTagLiToUl();
                document.dispatchEvent(areaAdjusted);
                debouncedUpdate();
            }  
        }
        });
}

async function deleteItem()
{
    console.log("deleteItem called");

    let itemId = document.querySelector(".edit_item_column").id.replace("edit_item_column", "");
    let payload = { item_id: itemId };
    console.log("Payload:", payload);
    let csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    await fetch("/delete", 
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

    deleteFromScreen()

    document.dispatchEvent(updateDatabaseCalled);
}

function deleteFromList()
{
    for (let i = 0; i < itemsData.length; i++)
    {
        let itemDisplayed = parseInt(document.querySelector(".edit_item_column").id.replace("edit_item_column", ""));
        let item = document.getElementById(String(itemsData[i].id));
        if (item && itemDisplayed == itemsData[i].id)
        {
            let parentItem = item.parentNode;
            parentItem.removeChild(item); 
        }
    }
}


function deleteFromScreen()
{
    deleteFromList();

    document.querySelector("#item_check_display").innerHTML = "";
    document.querySelector("#item_check_display").style.cssText = "";
    document.querySelector("#item_check_display").classList.remove("check-display-border");

    document.querySelector("#item_deadline_display").innerHTML = "";
    document.querySelector("#item_deadline_display").style.cssText = "";
    document.querySelector("#item_deadline_display").classList.remove("deadline-display");

    document.querySelector("#item_priority_display").innerHTML = "";
    document.querySelector("#item_priority_display").style.cssText = "";
    document.querySelector("#item_priority_display").classList.remove("priority-display");
    
    document.querySelector("#item_title_display").innerHTML = "";
    document.querySelector("#item_title_display").style.cssText = "";

    document.querySelector("#item_tags_display").innerHTML = "";
    document.querySelector("#item_tags_display").style.cssText = "";
    document.querySelector("#item_tags_display").classList.remove("webapp-item-tags");

    document.querySelector("#item_body_display").innerHTML = "";
    document.querySelector("#item_body_display").style.cssText = "";

    document.querySelector("#item_list_display").innerHTML = "";
    document.querySelector("#item_list_display").style.cssText = "";
    document.querySelector("#item_list_display").classList.remove("webapp-list-display");

    document.querySelector("#item_type_display").innerHTML = "";
    document.querySelector("#item_type_display").style.cssText = "";
    document.querySelector("#item_type_display").classList.remove("webapp-type-display");

    document.querySelector("#item_delete_display").innerHTML = "";
    document.querySelector("#item_delete_display").style.cssText = "";
    document.querySelector("#item_delete_display").classList.remove("webapp-delete");
}


function updateType()
{
    let itemDisplayed = parseInt(document.querySelector(".edit_item_column").id.replace("edit_item_column", ""));
    let item;
    for (let i = 0; i < itemsData.length; i++)
    {
        if (itemDisplayed == itemsData[i].id)
        {
            item = itemsData[i];
        }
    }
    updateItemTitle();
    if (item)
    {
        if (item.item_type == "note")
        {
            document.querySelector("#item_check_display").innerHTML = "";
            document.querySelector("#item_check_display").style.cssText = "";
            document.querySelector("#item_check_display").classList.remove("check-display-border");

            document.querySelector("#item_priority_display").innerHTML = "";
            document.querySelector("#item_priority_display").style.cssText = "";
            document.querySelector("#item_priority_display").classList.remove("priority-display");
        }
        else if (item.item_type == "task")
        {
            createItemCheck();
            createItemPriority();
        }
    }
}

function createItemPriority()
{
    let itemDisplayed = parseInt(document.querySelector(".edit_item_column").id.replace("edit_item_column", ""));
    let item;
    for (let i = 0; i < itemsData.length; i++)
    {
        if (itemDisplayed == itemsData[i].id)
        {
            item = itemsData[i];
        }
    }
    if (!document.querySelector(".priority-display"))
    {
        let prioritySelect = document.createElement("select");
        prioritySelect.classList.add("webapp-priority");
        prioritySelect.setAttribute("name", "Priority");
        document.querySelector("#item_priority_display").classList.add("priority-display");
        document.querySelector("#item_priority_display").innerHTML = "Priority: ";
        document.querySelector("#item_priority_display").appendChild(prioritySelect);
        prioritySelect.addEventListener("input", debouncedUpdate);
        prioritySelect.addEventListener("change", priorityColor);
        for (let i = 0; i < 4; i++)
            {
                let optionPrioritySelect = document.createElement("option");
                if (i == 0)
                {
                    optionPrioritySelect.value = 0;
                    optionPrioritySelect.innerHTML = "None";
                    optionPrioritySelect.classList.add("webapp-priority-option0");
                }
                else
                {
                    optionPrioritySelect.value = i;
                    optionPrioritySelect.classList.add("webapp-priority-option" + String(i));
                    if (i == 1)
                    {
                        optionPrioritySelect.innerHTML = "Low";
                    }
                    else if (i == 2)
                    {
                        optionPrioritySelect.innerHTML = "Medium";
                    }
                    else if (i == 3)
                    {
                        optionPrioritySelect.innerHTML = "High";
                    }
                    else
                    {
                        optionPrioritySelect.innerHTML = "None";
                    }
                }
                document.querySelector(".webapp-priority").appendChild(optionPrioritySelect);
            }
    }
    document.querySelector(".webapp-priority").value = item.item_priority;
    priorityColor();
}

function createItemCheck()
{
    let input = document.createElement("input");
    input.setAttribute("type", "checkbox");
    input.setAttribute("id", "check-item");
    document.querySelector("#item_check_display").style.cssText = "";
    document.querySelector("#item_check_display").classList.add("check-display-border");
    
    let itemDisplayed = parseInt(document.querySelector(".edit_item_column").id.replace("edit_item_column", ""));
    let item;
    for (let i = 0; i < itemsData.length; i++)
    {
        if (itemDisplayed == itemsData[i].id)
        {
            item = itemsData[i];
        }
    }

    if (!document.querySelector("#check-item"))
    {
        document.querySelector("#item_check_display").appendChild(input);
        input.addEventListener("change", debouncedUpdate);
        input.addEventListener("change", itemChangeCompletion);
    }

    updateCheckBox();
}

async function itemChangeCompletion()
{
    await updateDatabase();
    await fetchData();
    resetScreen();
}


function resetScreen()
{
    let ul = document.querySelector("#webapp_items_list_display");
    ul.innerHTML = "";

    for (let i = 0; i < itemsData.length; i++)
    {
        let item = itemsData[i];
        
        if (!item.item_status)
        {
            let li = document.createElement("li");
            let divItem = document.createElement("div");
            let divText = document.createElement("div");

            divItem.className = "shadow p-3 webapp-text rounded webapp-item";
            divItem.id = item.id;
            divItem.addEventListener('click', itemListener);

            divText.className = "webapp-item-title-text";
            divText.innerHTML = item.title;
            divText.addEventListener('click', itemListener);

            if (item.item_type == "note")
            {
                let imgNote = document.createElement("img");
                imgNote.setAttribute("src", "/static/edit.png");
                divItem.appendChild(imgNote);
            }
            else if(item.item_type == "task")
            {
                let inputItem = document.createElement("input");
                inputItem.setAttribute("type", "checkbox");
                if (item.priority == "null" || item.priority > 3)
                {
                    item.priority = 0;
                }
                inputItem.classList.add("form-check-input", "webapp-task-p" + item.item_priority);
                inputItem.addEventListener("input", itemListener);
                divItem.appendChild(inputItem);
            }
            
            divItem.appendChild(divText);
            li.appendChild(divItem);
            ul.appendChild(li);
        }
    }
}
