var tasksManager = function() {

    // appends a row to the tasks table.
    // @parentSelector: selector to append a row to.
    // @obj: task object to append.
    var appendRow = function(parentSelector, obj) {
        var tr = $("<tr data-id='" + obj.ToDoId + "'></tr>");
        tr.append("<td><input type='checkbox' class='completed' " + (obj.IsCompleted ? "checked" : "") + "/></td>");
        tr.append("<td class='name' >" + obj.Name + "</td>");
        tr.append("<td><input type='button' class='delete-button ph-button ph-btn-blue' value='Delete' /></td>");
        $(parentSelector).append(tr);
    }

    // adds all tasks as rows (deletes all rows before).
    // @parentSelector: selector to append a row to.
    // @tasks: array of tasks to append.
    var displayTasks = function(parentSelector, tasks) {
        $(parentSelector).empty();
        $.each(tasks, function(i, item) {
            appendRow(parentSelector, item);
        });
    };

    //display locally created tasks on form
    var dispalyLocalTasks = function(parentSelector, tasks) {
        $.each(tasks, function(i, item) {
            appendRow(parentSelector, item);
        });
    }
    // starts loading tasks from server.
    // @returns a promise.
    var loadTasks = function() {
        return $.getJSON("/api/todos");
    };

    // starts creating a task on the server.
    // @isCompleted: indicates if new task should be completed.
    // @name: name of new task.
    // @return a promise.
    var createTask = function(isCompleted, name) {
        return $.post("/api/todos",
        {
            IsCompleted: isCompleted,
            Name: name
        });
    };

    // creates local task
    //  @return a promise
    var createLocalTask = function(locakTask) {
        return $.post("/api/todos", locakTask);
    }

    // creates local tasks
    //  @return a promise
    var createLocalTasks = function (localTasks) {
        var i;
        for (i = 0; i < localTasks.length - 1; i++) {
            $.post("/api/todos", localTasks[i]);
        }
        return $.post("/api/todos", localTasks[i]);        
    }

    // append locally created task to form
    var addTaskFromLocalStorage = function (parentSelector, tasks) {
        appendRow(parentSelector, tasks);
    };

    // starts updating a task on the server.
    // @id: id of the task to update.
    // @isCompleted: indicates if the task should be completed.
    // @name: name of the task.
    // @return a promise.
    var updateTask = function(id, isCompleted, name) {
        return $.ajax(
        {
            url: "/api/todos",
            type: "PUT",
            contentType: 'application/json',
            data: JSON.stringify({
                ToDoId: id,
                IsCompleted: isCompleted,
                Name: name
            })
        });
    };

    // starts deleting a task on the server.
    // @taskId: id of the task to delete.
    // @return a promise.
    var deleteTask = function (taskId) {
        return $.ajax({
            url: "/api/todos/" + taskId,
            type: 'DELETE'
        });
    };

    //guid generator for local id
    var guid = function() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        };
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };

    // select all tasks from local storage
    var getMemoryTasks = function() {
        var a = [];
        for (var i = 0; i < localStorage.length; i++) {
            a[i] = JSON.parse(localStorage.getItem(localStorage.key(i)));
        }
        return a;
    };

    var getByNameComplete = function(tasks, name, isComplete) {
        for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].Name.trim() === name.trim() && tasks[i].IsCompleted === isComplete) {
                return tasks[i];
            }
        }
        return null;
    };

    var getByName = function(tasks, name) {
        for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].Name.trim() === name.trim()) {
                return tasks[i];
            }
        }
        return null;
    };

    // local update reccursivly
    var localUpdate = function(thisLocalTask, tasks) {
        if (thisLocalTask.Update > 0) {
            var localTaskToUpdate = tasksManager.getByName(tasks, thisLocalTask.Name);
            if (localTaskToUpdate) {
                tasksManager.updateTask(localTaskToUpdate.ToDoId, thisLocalTask.IsCompleted, thisLocalTask.Name)
                    .then(function() {
                        var currentTask = JSON.parse(localStorage.getItem(thisLocalTask.LocalToDoId));
                        currentTask.Update--;
                        localStorage.setItem(currentTask.LocalToDoId, JSON.stringify(currentTask));
                        if (currentTask.Update > 0) {
                            localUpdate(currentTask, tasks);
                        }
                    });
                var $task = $('#tasks > tbody tr[data-id=' + localTaskToUpdate.ToDoId + ']');
                $($task).find('.name').html(thisLocalTask.Name);
                thisLocalTask.IsCompleted ? $($task).find('input:checkbox:first').attr('checked', 'checked') : ($task).find('input:checkbox:first').attr('checked', 'unchecked');
            }
        };
    }
    // returns public interface of task manager.
    return {
        loadTasks: loadTasks,
        displayTasks: displayTasks,
        createTask: createTask,
        deleteTask: deleteTask,
        updateTask: updateTask,
        addTaskFromLocalStorage: addTaskFromLocalStorage,
        guid: guid,
        displayLocalTasks: dispalyLocalTasks,
        createLocalTask: createLocalTask,
        createLocalTasks: createLocalTasks,
        getAllMemoryTasks: getMemoryTasks,
        getByNameComplete: getByNameComplete,
        getByName: getByName,
        localUpdate: localUpdate
    };
}();


$(function () {
    // add new task button click handler
    $("#newCreate").click(function() {
        var isCompleted = $('#newCompleted')[0].checked;
        var name = $('#newName')[0].value;
        var localguid = tasksManager.guid();
        var t = { LocalToDoId: localguid, IsCompleted: isCompleted, Name: name, UserId: $.cookie("user"), Delete: false, Update: 0 }
        localStorage.setItem(localguid, JSON.stringify(t));
        tasksManager.addTaskFromLocalStorage("#tasks > tbody", t);

        tasksManager.createTask(isCompleted, name)
            .then(tasksManager.loadTasks)
            .done(function (tasks) {
                tasksManager.displayTasks("#tasks > tbody", tasks);
                var thisLocalTask = JSON.parse(localStorage.getItem(localguid));
                if (thisLocalTask) {
                    tasksManager.localUpdate(thisLocalTask, tasks);
                    if (thisLocalTask.Delete == true) {
                        var localTaskToDelete = tasksManager.getByNameComplete(tasks, thisLocalTask.Name, thisLocalTask.IsCompleted);
                        if (localTaskToDelete) {
                            tasksManager.deleteTask(localTaskToDelete.ToDoId);
                            $('#tasks > tbody tr[data-id=' + localTaskToDelete.ToDoId + ']').hide();
                        }
                    }   
                }
                localStorage.removeItem(localguid);
            });
    });

    // bind update task checkbox click handler
    $("#tasks > tbody").on('change', '.completed', function () {
        var tr = $(this).parent().parent();
        var taskId = tr.attr("data-id");
        var isCompleted = tr.find('.completed')[0].checked;
        var name = tr.find('.name').text();
        var localTask;
        if (taskId == 'undefined') {
            localTask = tasksManager.getByName(tasksManager.getAllMemoryTasks(), name);
            if (localTask) {
                localTask.Update++;
                localTask.IsCompleted = isCompleted;
                localTask.Name = name;
                console.log("localTask", localTask);
                localStorage.setItem(localTask.LocalToDoId, JSON.stringify(localTask));
            }
        } else {
            localTask = { ToDoId: taskId, LocalToDoId: tasksManager.guid(), IsCompleted: isCompleted, Name: name, UserId: $.cookie("user"), Event: 'update' };
            localStorage.setItem(localTask.LocalToDoId, JSON.stringify(localTask));

            tasksManager.updateTask(taskId, isCompleted, name)
                .then(tasksManager.loadTasks)
                .done(function (tasks) {
                    tasksManager.displayTasks("#tasks > tbody", tasks);
                });
        }
    });

    // bind delete button click for future rows
    $('#tasks > tbody').on('click', '.delete-button', function() {
        var tr = $(this).parent().parent();
        var taskId = tr.attr("data-id");
        if (taskId == 'undefined') {
            var isCompleted = tr.find('.completed')[0].checked;
            var name = tr.find('.name').text();
            var localTask = tasksManager.getByNameComplete(tasksManager.getAllMemoryTasks(), name, isCompleted);
            if (localTask) {
                tr.hide();
                localTask.Delete = true;
                localStorage.setItem(localTask.LocalToDoId, JSON.stringify(localTask));
            }
        } else {
            tasksManager.deleteTask(taskId)
                .then(tasksManager.loadTasks)
                .done(function (tasks) {
                    tasksManager.displayTasks("#tasks > tbody", tasks);
                });
        }
    });
    //localStorage.clear();

    //load from start
    $('#loading').show();
    tasksManager.loadTasks()
        .done(function(tasks) {
            tasksManager.displayTasks("#tasks > tbody", tasks);
            $('#loading').hide();
            return tasks;
            }
        ).then(function(tasks) {
            var localTasks = tasksManager.getAllMemoryTasks(); 
            var localTasksCount = localTasks.length;
            for (var j = localTasksCount - 1; j >= 0; j--) {
                if (localTasks[j].Event === 'update') {
                    for (var k = 0; k < tasks.length; k++) {
                        if ((localTasks[j].ToDoId === tasks[k].ToDoId) && (tasks[k].Name.trim() === localTasks[j].Name.trim()) && (tasks[k].IsCompleted === localTasks[j].IsCompleted)) {
                            localStorage.removeItem(localTasks[j].LocalToDoId);
                        }
                    }                 
                }
                for (var i = 0; i < tasks.length; i++) {
                    if ((tasks[i].Name.trim() === localTasks[j].Name.trim()) && (tasks[i].IsCompleted === localTasks[j].IsCompleted)) {
                        localStorage.removeItem(localTasks[j].LocalToDoId);
                    }
                }
            }
            var remainingTasks = tasksManager.getAllMemoryTasks();
            if (remainingTasks.length > 0)
                tasksManager.createLocalTasks(remainingTasks)
                    .then(tasksManager.loadTasks)
                    .done(function(tasks) {
                        tasksManager.displayTasks("#tasks > tbody", tasks);
                        for (var i = 0; i < remainingTasks.length; i++) {
                            localStorage.removeItem(remainingTasks[i].LocalToDoId);
                        }
                    });
        }
        );
 });